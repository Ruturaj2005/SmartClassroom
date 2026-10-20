#!/usr/bin/env python3
"""
SmartClass classroom kiosk for Raspberry Pi + PN532.

  idle screen ──tap card──▶ faculty's material list ──pick──▶ full-screen presentation
       ▲                           │
       └──── tap same card again / Log out / idle timeout

Files are cached on the SD card by material id + version + hash, so a lecture
opened once opens instantly next time and still works if the server is down.

Run on a PC without a reader:  python smartclass_kiosk.py --simulate
(type a card UID such as 04:A1:B2:C3:D4 into the terminal and press Enter)
"""

import argparse
import configparser
import hashlib
import json
import logging
import os
import queue
import shlex
import subprocess
import sys
import threading
import time
import tkinter as tk
from pathlib import Path

import requests

log = logging.getLogger("smartclass")

COLORS = {
    "bg": "#0f172a",
    "panel": "#1e293b",
    "panel_hover": "#334155",
    "text": "#f8fafc",
    "muted": "#94a3b8",
    "accent": "#38bdf8",
    "now": "#22c55e",
    "error": "#f87171",
}


# ── Configuration ────────────────────────────────────────────────────────────

class Config:
    def __init__(self, path: Path):
        parser = configparser.ConfigParser()
        if not parser.read(path):
            sys.exit(f"Config file not found: {path} (copy config.example.ini to config.ini)")
        c = parser["smartclass"]
        self.server_url = c.get("server_url").rstrip("/")
        self.device_key = c.get("device_key")
        self.reader = c.get("reader", "pn532_i2c")
        self.cache_dir = Path(c.get("cache_dir", "~/.smartclass/cache")).expanduser()
        self.idle_logout_minutes = c.getint("idle_logout_minutes", 15)
        self.pdf_viewer = c.get("pdf_viewer", "evince --presentation {file}")
        self.pptx_viewer = c.get("pptx_viewer", "libreoffice --norestore --show {file}")
        self.fullscreen = c.getboolean("fullscreen", True)

        if not self.device_key or self.device_key.startswith("scdev_PASTE"):
            sys.exit("Set device_key in config.ini (Admin → Edge Devices → New key)")

    @property
    def api(self):
        return f"{self.server_url}/api/v1"


# ── Server API ───────────────────────────────────────────────────────────────

class OfflineError(Exception):
    """Server unreachable."""


class ServerError(Exception):
    """Server answered with an error."""


class SmartClassApi:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers["X-Device-Key"] = cfg.device_key

    def _request(self, method, path, tap_token=None, **kwargs):
        headers = kwargs.pop("headers", {})
        if tap_token:
            headers["X-Tap-Token"] = tap_token
        try:
            resp = self.session.request(method, f"{self.cfg.api}{path}", headers=headers,
                                        timeout=kwargs.pop("timeout", 10), **kwargs)
        except requests.RequestException as e:
            raise OfflineError(str(e)) from e
        if resp.status_code >= 400 and not kwargs.get("stream"):
            try:
                message = resp.json()["error"]["message"]
            except Exception:
                message = f"HTTP {resp.status_code}"
            raise ServerError(message)
        return resp

    def whoami(self):
        return self._request("GET", "/edge/me").json()["data"]

    def tap(self, uid):
        return self._request("POST", "/edge/tap", json={"uid": uid}).json()["data"]

    def download(self, material_id, tap_token, dest: Path, prefer_pdf=True):
        """Streams the file to dest; returns the format the server sent ('pdf' or 'original')."""
        fmt = "pdf" if prefer_pdf else "original"
        resp = self._request("GET", f"/edge/materials/{material_id}/file?format={fmt}",
                             tap_token=tap_token, stream=True, timeout=60)
        if resp.status_code >= 400:
            raise ServerError(f"Download failed (HTTP {resp.status_code})")
        tmp = dest.with_suffix(dest.suffix + ".part")
        with open(tmp, "wb") as f:
            for chunk in resp.iter_content(chunk_size=256 * 1024):
                f.write(chunk)
        os.replace(tmp, dest)
        return resp.headers.get("X-File-Format", fmt)

    def open_material(self, material_id, tap_token, retrieval_mode):
        return self._request("POST", f"/edge/materials/{material_id}/open", tap_token=tap_token,
                             json={"retrievalMode": retrieval_mode}).json()["data"]

    def logout(self, tap_token):
        self._request("POST", "/edge/logout", tap_token=tap_token)


# ── Local cache ──────────────────────────────────────────────────────────────

class Cache:
    """
    files/<materialId>/v<version>-<hash12>.<pdf|ext>   lecture files
    faculty/<sha256(uid)>.json                         last tap result, for offline use
    """

    def __init__(self, root: Path):
        self.files = root / "files"
        self.faculty = root / "faculty"
        self.files.mkdir(parents=True, exist_ok=True)
        self.faculty.mkdir(parents=True, exist_ok=True)

    def _stem(self, m):
        return f"v{m['version']}-{m['fileHash'][:12]}"

    def find(self, m):
        folder = self.files / m["id"]
        if folder.is_dir():
            for f in folder.iterdir():
                if f.stem == self._stem(m) and not f.name.endswith(".part"):
                    return f
        return None

    def target(self, m, as_pdf):
        folder = self.files / m["id"]
        folder.mkdir(parents=True, exist_ok=True)
        # Old versions of this material are no longer needed
        for old in folder.iterdir():
            if old.stem != self._stem(m):
                old.unlink(missing_ok=True)
        ext = ".pdf" if as_pdf else Path(m["originalFileName"]).suffix.lower()
        return folder / f"{self._stem(m)}{ext}"

    def _uid_file(self, uid):
        return self.faculty / (hashlib.sha256(uid.encode()).hexdigest() + ".json")

    def save_tap(self, uid, data):
        safe = {k: v for k, v in data.items() if k != "tapToken"}
        self._uid_file(uid).write_text(json.dumps(safe))

    def load_tap(self, uid):
        f = self._uid_file(uid)
        return json.loads(f.read_text()) if f.exists() else None


# ── RFID readers ─────────────────────────────────────────────────────────────

def format_uid(raw: bytes) -> str:
    return ":".join(f"{b:02X}" for b in raw)


def pn532_reader(kind, on_uid, stop: threading.Event):
    import board
    import busio

    if kind == "pn532_spi":
        import digitalio
        from adafruit_pn532.spi import PN532_SPI
        spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
        pn532 = PN532_SPI(spi, digitalio.DigitalInOut(board.D5), debug=False)
    else:
        from adafruit_pn532.i2c import PN532_I2C
        pn532 = PN532_I2C(busio.I2C(board.SCL, board.SDA), debug=False)

    ic, ver, rev, support = pn532.firmware_version
    log.info("PN532 firmware %d.%d ready", ver, rev)
    pn532.SAM_configuration()

    last_uid, last_time = None, 0.0
    while not stop.is_set():
        try:
            raw = pn532.read_passive_target(timeout=0.5)
        except Exception as e:  # loose wire / bus glitch: keep trying
            log.warning("PN532 read error: %s", e)
            time.sleep(1)
            continue
        if raw is None:
            continue
        uid = format_uid(raw)
        # A card held on the reader is reported continuously; count it once
        now = time.monotonic()
        if uid != last_uid or now - last_time > 3:
            on_uid(uid)
        last_uid, last_time = uid, now


def stdin_reader(on_uid, stop: threading.Event):
    print("Simulated reader: type a card UID (e.g. 04:A1:B2:C3:D4) and press Enter")
    for line in sys.stdin:
        uid = line.strip().upper()
        if uid:
            on_uid(uid)
        if stop.is_set():
            break


# ── Kiosk UI ─────────────────────────────────────────────────────────────────

class Kiosk:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.api = SmartClassApi(cfg)
        self.cache = Cache(cfg.cache_dir)
        self.events = queue.Queue()     # (callable, args) to run on the UI thread
        self.current = None             # {"uid", "data", "offline"}
        self.viewer = None              # subprocess of the open presentation
        self.last_activity = time.monotonic()
        self.classroom_name = ""

        self.root = tk.Tk()
        self.root.title("SmartClass")
        self.root.configure(bg=COLORS["bg"])
        if cfg.fullscreen:
            self.root.attributes("-fullscreen", True)
        else:
            self.root.geometry("1024x640")
        self.root.bind("<Escape>", lambda e: self.root.attributes("-fullscreen", False))
        self.root.bind_all("<Any-Button>", lambda e: self._touch())
        self.root.bind_all("<Any-KeyPress>", lambda e: self._touch())

        self.frame = tk.Frame(self.root, bg=COLORS["bg"])
        self.frame.pack(fill="both", expand=True, padx=48, pady=36)

        self.show_idle("Connecting to server…")
        self._in_background(self.api.whoami, self._on_whoami, self._on_whoami_error)
        self.root.after(100, self._drain_events)
        self.root.after(30_000, self._check_idle)

    # threading helpers

    def post(self, fn, *args):
        self.events.put((fn, args))

    def _drain_events(self):
        try:
            while True:
                fn, args = self.events.get_nowait()
                fn(*args)
        except queue.Empty:
            pass
        self.root.after(100, self._drain_events)

    def _in_background(self, work, on_done, on_error):
        def run():
            try:
                result = work()
            except Exception as e:
                self.post(on_error, e)
            else:
                self.post(on_done, result)
        threading.Thread(target=run, daemon=True).start()

    def _touch(self):
        self.last_activity = time.monotonic()

    # screens

    def _clear(self):
        for w in self.frame.winfo_children():
            w.destroy()

    def _label(self, text, size, color="text", **pack):
        lbl = tk.Label(self.frame, text=text, bg=COLORS["bg"], fg=COLORS[color],
                       font=("DejaVu Sans", size), wraplength=1400, justify="left")
        lbl.pack(anchor=pack.pop("anchor", "w"), **pack)
        return lbl

    def show_idle(self, message=None, error=False):
        self._clear()
        tk.Frame(self.frame, bg=COLORS["bg"]).pack(expand=True)
        self._label("SmartClass", 20, "accent", anchor="center")
        self._label(self.classroom_name or " ", 18, "muted", anchor="center", pady=(0, 30))
        self._label("Tap your ID card", 48, anchor="center")
        if message:
            self._label(message, 18, "error" if error else "muted", anchor="center", pady=(24, 0))
        tk.Frame(self.frame, bg=COLORS["bg"]).pack(expand=True)

    def show_materials(self):
        data, offline = self.current["data"], self.current["offline"]
        self._clear()

        header = tk.Frame(self.frame, bg=COLORS["bg"])
        header.pack(fill="x")
        tk.Label(header, text=f"Welcome, {data['faculty']['name']}", bg=COLORS["bg"], fg=COLORS["text"],
                 font=("DejaVu Sans", 30, "bold")).pack(side="left")
        tk.Button(header, text="Log out", command=self.logout, font=("DejaVu Sans", 16),
                  bg=COLORS["panel"], fg=COLORS["text"], activebackground=COLORS["panel_hover"],
                  activeforeground=COLORS["text"], relief="flat", padx=24, pady=8).pack(side="right")

        sub = data["classroom"]["name"]
        if data.get("currentLecture"):
            cl = data["currentLecture"]
            sub += f"  ·  Scheduled now: {cl['courseCode']} {cl['courseName']} ({cl['startTime']}–{cl['endTime']})"
        self._label(sub, 15, "muted", pady=(4, 0))
        if offline:
            self._label("Server unreachable: showing files saved on this device", 15, "error", pady=(4, 0))

        self.status = self._label("", 16, "accent", pady=(12, 8))

        materials = data["materials"]
        if offline:
            materials = [m for m in materials if self.cache.find(m)]
        if not materials:
            self._label("No materials yet. Upload them from the SmartClass website.", 20, "muted", pady=40)
            return

        canvas = tk.Canvas(self.frame, bg=COLORS["bg"], highlightthickness=0)
        scrollbar = tk.Scrollbar(self.frame, orient="vertical", command=canvas.yview, width=24)
        inner = tk.Frame(canvas, bg=COLORS["bg"])
        inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        window = canvas.create_window((0, 0), window=inner, anchor="nw")
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(window, width=e.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        for m in materials:
            self._material_row(inner, m)

    def _material_row(self, parent, m):
        row = tk.Frame(parent, bg=COLORS["panel"], cursor="hand2")
        row.pack(fill="x", pady=6)
        title = m["title"] + (f"   v{m['version']}" if m["version"] > 1 else "")
        top = tk.Label(row, text=title, bg=COLORS["panel"], fg=COLORS["text"],
                       font=("DejaVu Sans", 22, "bold"), anchor="w")
        top.pack(fill="x", padx=20, pady=(14, 0))
        info = f"{m['course']['courseCode']} · {m['course']['courseName']}"
        if self.cache.find(m):
            info += "  · saved on device"
        bottom = tk.Label(row, text=info, bg=COLORS["panel"], fg=COLORS["muted"],
                          font=("DejaVu Sans", 14), anchor="w")
        bottom.pack(fill="x", padx=20, pady=(2, 14))
        if m.get("isCurrentLecture"):
            tk.Label(row, text="NOW", bg=COLORS["now"], fg=COLORS["bg"],
                     font=("DejaVu Sans", 12, "bold"), padx=10).place(relx=1.0, x=-20, y=16, anchor="ne")

        def hover(on):
            color = COLORS["panel_hover"] if on else COLORS["panel"]
            for w in (row, top, bottom):
                w.configure(bg=color)

        for w in (row, top, bottom):
            w.bind("<Button-1>", lambda e, mat=m: self.open_material(mat))
            w.bind("<Enter>", lambda e: hover(True))
            w.bind("<Leave>", lambda e: hover(False))

    # card taps

    def on_card(self, uid):
        """Called from the reader thread."""
        self.post(self._handle_card, uid)

    def _handle_card(self, uid):
        log.info("Card tapped: %s", uid)
        self._touch()
        if self.current and self.current["uid"] == uid:
            self.logout()
            return
        if self.current:
            self.logout(show_idle=False)

        self.show_idle("Checking card…")
        self._in_background(lambda: self.api.tap(uid),
                            lambda data: self._on_tap(uid, data),
                            lambda err: self._on_tap_error(uid, err))

    def _on_tap(self, uid, data):
        if not data.get("authenticated"):
            self.show_idle(data.get("reason", "Card not recognised"), error=True)
            self.root.after(4000, lambda: self.current is None and self.show_idle())
            return
        self.cache.save_tap(uid, data)
        self.current = {"uid": uid, "data": data, "offline": False}
        self.show_materials()

    def _on_tap_error(self, uid, err):
        cached = self.cache.load_tap(uid) if isinstance(err, OfflineError) else None
        if cached:
            log.warning("Server unreachable, using cached list for card")
            self.current = {"uid": uid, "data": cached, "offline": True}
            self.show_materials()
        else:
            self.show_idle(f"Could not reach the server: {err}" if isinstance(err, OfflineError) else str(err),
                           error=True)

    # opening files

    def open_material(self, m):
        if not self.current:
            return
        self._touch()
        token = self.current["data"].get("tapToken")
        offline = self.current["offline"]
        self._set_status(f"Opening {m['title']}…")

        def work():
            cached = self.cache.find(m)
            if cached:
                mode = "OFFLINE" if offline else "CACHE"
                path = cached
            else:
                if offline:
                    raise OfflineError("file is not saved on this device")
                dest = self.cache.target(m, as_pdf=m["pdfAvailable"])
                fmt = self.api.download(m["id"], token, dest, prefer_pdf=m["pdfAvailable"])
                if (fmt == "pdf") != (dest.suffix == ".pdf"):  # server's PDF state changed meanwhile
                    fixed = self.cache.target(m, as_pdf=(fmt == "pdf"))
                    os.replace(dest, fixed)
                    dest = fixed
                mode, path = "SERVER", dest
            if not offline:
                try:
                    self.api.open_material(m["id"], token, mode)
                except (OfflineError, ServerError) as e:
                    log.warning("Could not log session: %s", e)
            return path

        self._in_background(work, self._launch_viewer,
                            lambda e: self._set_status(f"Could not open: {e}", error=True))

    def _launch_viewer(self, path: Path):
        self._close_viewer()
        template = self.cfg.pdf_viewer if path.suffix == ".pdf" else self.cfg.pptx_viewer
        if template.strip().lower() != "system":
            cmd = [part.replace("{file}", str(path)) for part in shlex.split(template)]
            log.info("Opening %s", cmd)
            try:
                self.viewer = subprocess.Popen(cmd)
                self._set_status("Presentation opened. Close it to come back here.")
                return
            except FileNotFoundError:
                if sys.platform != "win32":
                    self._set_status(f"Viewer not installed: {cmd[0]}", error=True)
                    return
                log.info("%s not installed, using the default Windows app", cmd[0])
        self._open_with_system_app(path)

    def _open_with_system_app(self, path: Path):
        """Testing on a PC: open with whatever app the OS uses for this file type."""
        log.info("Opening %s with the default app", path)
        try:
            if sys.platform == "win32":
                os.startfile(path)
            else:
                subprocess.Popen(["xdg-open", str(path)])
            # The kiosk can't track or close an app the OS launched for it
            self._set_status("Opened in the default app.")
        except OSError as e:
            self._set_status(f"Could not open the file: {e}", error=True)

    def _set_status(self, text, error=False):
        # The list screen may have been replaced (logout, new tap) while work ran
        try:
            self.status.configure(text=text, fg=COLORS["error" if error else "accent"])
        except (AttributeError, tk.TclError):
            pass

    def _close_viewer(self):
        if self.viewer and self.viewer.poll() is None:
            self.viewer.terminate()
            try:
                self.viewer.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.viewer.kill()
        self.viewer = None

    # logout

    def logout(self, show_idle=True):
        self._close_viewer()
        if self.current and not self.current["offline"]:
            token = self.current["data"]["tapToken"]
            threading.Thread(target=self._safe_logout, args=(token,), daemon=True).start()
        self.current = None
        if show_idle:
            self.show_idle("Logged out")
            self.root.after(3000, lambda: self.current is None and self.show_idle())

    def _safe_logout(self, token):
        try:
            self.api.logout(token)
        except Exception as e:
            log.warning("Logout call failed: %s", e)

    def _check_idle(self):
        presenting = self.viewer is not None and self.viewer.poll() is None
        idle_for = time.monotonic() - self.last_activity
        if self.current and not presenting and idle_for > self.cfg.idle_logout_minutes * 60:
            log.info("Idle timeout, logging out")
            self.logout()
        self.root.after(30_000, self._check_idle)

    # startup

    def _on_whoami(self, device):
        self.classroom_name = f"{device['classroomName']}  ·  {device['deviceCode']}"
        if not self.current:
            self.show_idle()

    def _on_whoami_error(self, err):
        if isinstance(err, OfflineError):
            # Still usable for cached lectures; retry for the classroom name
            if not self.current:
                self.show_idle("Server unreachable: only saved lectures will open")
            self.root.after(30_000, lambda: self._in_background(
                self.api.whoami, self._on_whoami, self._on_whoami_error))
        else:
            self.show_idle(f"Device not accepted by server: {err}", error=True)

    def run(self):
        self.root.mainloop()


def main():
    parser = argparse.ArgumentParser(description="SmartClass classroom kiosk")
    parser.add_argument("--config", default=str(Path(__file__).with_name("config.ini")))
    parser.add_argument("--simulate", action="store_true", help="read card UIDs from the terminal instead of a PN532")
    parser.add_argument("--windowed", action="store_true", help="do not go full screen")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = Config(Path(args.config))
    if args.windowed:
        cfg.fullscreen = False

    kiosk = Kiosk(cfg)
    stop = threading.Event()
    if args.simulate or cfg.reader == "simulate":
        target, reader_args = stdin_reader, (kiosk.on_card, stop)
    else:
        target, reader_args = pn532_reader, (cfg.reader, kiosk.on_card, stop)

    def run_reader():
        try:
            target(*reader_args)
        except Exception as e:
            log.exception("RFID reader stopped")
            kiosk.post(kiosk.show_idle, f"Card reader error: {e}. Check the PN532 wiring.", True)

    threading.Thread(target=run_reader, daemon=True).start()

    try:
        kiosk.run()
    finally:
        stop.set()


if __name__ == "__main__":
    main()
