#!/usr/bin/env bash
# One-time server setup for the KetTek video pipeline (Ubuntu 22.04/24.04 or Debian 12).
#
#   sudo bash server/setup.sh <linux-user>
#
# <linux-user> is the account people log in with to edit videos (e.g. "video").
# Safe to run again: every step checks before it changes anything.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="${1:-${SUDO_USER:-}}"
SERVICE=kettek-studio

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!  %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo: sudo bash server/setup.sh <linux-user>"; exit 1; }
[ -n "$RUN_USER" ] && id "$RUN_USER" >/dev/null 2>&1 || { echo "User '$RUN_USER' not found. Create it first: sudo adduser video"; exit 1; }
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"

say "Checking server size"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
CPUS=$(nproc)
echo "RAM: ${MEM_MB} MB · CPU cores: ${CPUS}"
if [ "$MEM_MB" -lt 3500 ]; then
  warn "Less than 4 GB RAM. Preview works, but full renders will be slow and may run out of memory."
  if [ "$(swapon --show | wc -l)" -eq 0 ] && [ ! -f /swapfile ]; then
    say "Adding a 4 GB swap file so renders don't crash"
    fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

say "Installing system packages (Chrome libraries, ffmpeg)"
apt-get update -qq
ASOUND=libasound2
apt-cache show libasound2t64 >/dev/null 2>&1 && ASOUND=libasound2t64
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl ca-certificates git unzip ffmpeg iptables \
  libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm-dev "$ASOUND" libxrandr2 libxkbcommon-dev \
  libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 >/dev/null

say "Installing Node.js 22"
NODE_MAJOR=$(node -v 2>/dev/null | sed -E 's/v([0-9]+).*/\1/' || echo 0)
if [ "${NODE_MAJOR:-0}" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

say "Installing project dependencies"
chown -R "$RUN_USER":"$RUN_USER" "$PROJECT_DIR"
rm -rf "$PROJECT_DIR/node_modules/.cache"
sudo -u "$RUN_USER" -H bash -lc "cd '$PROJECT_DIR' && npm ci --no-audit --no-fund && npx remotion browser ensure"

if [ ! -f "$PROJECT_DIR/.env" ]; then
  sudo -u "$RUN_USER" cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  warn "Created .env from the template — add the ElevenLabs key: nano $PROJECT_DIR/.env"
fi
chown "$RUN_USER":"$RUN_USER" "$PROJECT_DIR/.env"
chmod 600 "$PROJECT_DIR/.env"

say "Installing Claude Code for $RUN_USER"
if ! sudo -u "$RUN_USER" -H bash -lc 'command -v claude >/dev/null || test -x ~/.local/bin/claude'; then
  sudo -u "$RUN_USER" -H bash -lc 'curl -fsSL https://claude.ai/install.sh | bash'
fi

say "Creating the always-on service ($SERVICE)"
NPM_BIN="$(command -v npm)"
cat > /etc/systemd/system/$SERVICE.service <<EOF
[Unit]
Description=KetTek video studio (Remotion Studio :3000, exports :3001, storyboard watcher)
After=network-online.target

[Service]
User=$RUN_USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$(dirname "$NPM_BIN"):/usr/local/bin:/usr/bin:/bin
# Studio listens on every interface; keep ports 3000/3001 reachable only from the server itself (SSH tunnel)
ExecStartPre=+/bin/sh -c 'for p in 3000 3001; do for t in iptables ip6tables; do \$t -C INPUT -p tcp --dport \$p ! -i lo -j DROP 2>/dev/null || \$t -I INPUT -p tcp --dport \$p ! -i lo -j DROP 2>/dev/null || true; done; done'
ExecStart=$NPM_BIN run server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now $SERVICE
# Let the editing user restart/inspect the service without a password
cat > /etc/sudoers.d/$SERVICE <<EOF
$RUN_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart $SERVICE, /usr/bin/systemctl status $SERVICE, /usr/bin/journalctl -u $SERVICE *
EOF
chmod 440 /etc/sudoers.d/$SERVICE

say "Login shortcut: land in the project with a short help message"
MARK="# >>> kettek video <<<"
if ! grep -q "$MARK" "$RUN_HOME/.bashrc" 2>/dev/null; then
  cat >> "$RUN_HOME/.bashrc" <<EOF

$MARK
export PATH="\$HOME/.local/bin:\$PATH"
if [ -n "\$SSH_CONNECTION" ] && [ -z "\$TMUX" ]; then
  cd "$PROJECT_DIR"
  echo ""
  echo "  KetTek video stüdyosu"
  echo "  ──────────────────────"
  echo "  Önizleme : http://localhost:3000"
  echo "  Videolar : http://localhost:3001"
  echo "  Başlamak : claude   (sonra ne istediğini Türkçe yaz)"
  echo ""
fi
# <<< kettek video >>>
EOF
  chown "$RUN_USER":"$RUN_USER" "$RUN_HOME/.bashrc"
fi

sleep 3
say "Done"
systemctl --no-pager --lines=5 status $SERVICE || true
IP=$(hostname -I | awk '{print $1}')
cat <<EOF

Connect from your own computer with:

  ssh -L 3000:localhost:3000 -L 3001:localhost:3001 $RUN_USER@$IP

then open http://localhost:3000 (preview) and http://localhost:3001 (videos) in the browser.
First time only: run  claude  and follow the login link.
EOF
