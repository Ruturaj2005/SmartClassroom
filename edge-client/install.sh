#!/usr/bin/env bash
# One-time setup on a Raspberry Pi (Raspberry Pi OS Bookworm, desktop edition).
#   cd ~/smartclass/edge-client && bash install.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "== Installing system packages"
sudo apt-get update
sudo apt-get install -y python3-venv python3-tk evince libreoffice-impress fonts-dejavu unclutter

echo "== Enabling I2C (PN532 in I2C mode) and SPI"
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0
sudo usermod -aG i2c,spi,gpio "$USER"

echo "== Python environment"
python3 -m venv --system-site-packages "$DIR/.venv"
"$DIR/.venv/bin/pip" install --upgrade pip
"$DIR/.venv/bin/pip" install -r "$DIR/requirements.txt"

if [ ! -f "$DIR/config.ini" ]; then
  cp "$DIR/config.example.ini" "$DIR/config.ini"
  echo "!! Edit $DIR/config.ini: set server_url and device_key"
fi

echo "== Start the kiosk automatically when the desktop starts"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/smartclass-kiosk.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=SmartClass Kiosk
Exec=sh -c 'unclutter -idle 3 & exec "$DIR/.venv/bin/python" "$DIR/smartclass_kiosk.py"'
X-GNOME-Autostart-enabled=true
DESKTOP

echo "Done. Edit config.ini, then reboot (needed once for I2C/SPI permissions)."
echo "Check the reader with: i2cdetect -y 1   (the PN532 shows up at address 24)"
