# SmartClass Classroom Kiosk (Raspberry Pi + PN532)

A full-screen app for the classroom Pi. A faculty member taps their ID card and sees **only the
material they uploaded**, picks one, and it opens full screen on the projector.

## Hardware

- Raspberry Pi 4 or 5 (2 GB+), Raspberry Pi OS **Bookworm, desktop edition**
- PN532 NFC/RFID module, 13.56 MHz MIFARE/NTAG cards
- HDMI to the projector, plus a mouse, touchscreen or wireless presenter

### Wiring (I2C, recommended)

Set the PN532's mode switches to **I2C** (on most red boards: SEL0 = ON/1, SEL1 = OFF/0).

| PN532 | Raspberry Pi pin |
|-------|------------------|
| VCC   | Pin 1 (3.3V)     |
| GND   | Pin 6 (GND)      |
| SDA   | Pin 3 (GPIO2)    |
| SCL   | Pin 5 (GPIO3)    |

For SPI, set `reader = pn532_spi` and wire SCK→GPIO11, MISO→GPIO9, MOSI→GPIO10, SS→GPIO5.

## Setup

1. On the website, go to **Edge Devices → Register Device** for the classroom and copy the **device key**.
   It's shown only once.
2. Copy this folder to the Pi, e.g. `~/smartclass/edge-client`, then run:
   ```bash
   bash install.sh
   nano config.ini        # set server_url (the server PC's IP) and device_key
   sudo reboot
   ```
3. Check that the reader is detected: `i2cdetect -y 1` should show `24`.

The kiosk starts automatically with the desktop. To run it by hand:

```bash
.venv/bin/python smartclass_kiosk.py --windowed
```

## Using it

| Action | Result |
|---|---|
| Tap card | Your materials appear. Ones for the lecture scheduled now are marked **NOW** |
| Click a material | Opens full screen (PDF in Evince, or PPTX in LibreOffice if no PDF exists) |
| Close the presentation | Back to your list |
| Tap the same card again, or **Log out** | Logged out, screen returns to "Tap your ID card" |
| Different card while logged in | Switches to that faculty member |
| No touch for 15 min (not presenting) | Logged out automatically |

Files are saved in `~/.smartclass/cache` and are re-downloaded only when a new version is uploaded.
If the server is down, faculty who have tapped on this Pi before can still open lectures that are
already saved there.

## Trying it without a Pi

On any PC with Python 3:

```bash
pip install requests
cp config.example.ini config.ini   # server_url + a device key, set reader = simulate
python smartclass_kiosk.py --simulate --windowed
```

Type a card UID (e.g. `04:A1:B2:C3:D4` from the seed data) into the terminal and press Enter to "tap".

## Card UIDs

The kiosk sends UIDs in uppercase with colons, e.g. `04:A1:B2:C3:D4`. Register cards on the website in the
same format. To find a card's UID, run the kiosk in a terminal and tap the card: the UID is printed in
the log as `Card tapped: …`.
