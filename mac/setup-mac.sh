#!/bin/bash
# One-time Mac setup. Run in Terminal from the project folder:
#   bash mac/setup-mac.sh
# Installs project dependencies and Claude Code, then puts "KetTek Video" on the Desktop:
# double-click → preview starts, browser tabs open, Claude is ready.
# Safe to run again (e.g. after moving the folder — the app remembers the folder's path).
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="KetTek Video"
APP="$HOME/Desktop/$APP_NAME.app"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!  %s\033[0m\n' "$*"; }

[ "$(uname)" = "Darwin" ] || { echo "This script is for macOS."; exit 1; }
cd "$DIR"
[ -f package.json ] || { echo "package.json not found in $DIR"; exit 1; }
case "$DIR" in
  "$HOME/Desktop"*|"$HOME/Documents"*) warn "The project is in Desktop/Documents. If iCloud syncs those folders, move it to $HOME/KetTekVideo first." ;;
esac
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

say "Node.js"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  warn "Node.js 22 LTS is needed. Opening the download page — install the macOS package, then run this script again."
  open "https://nodejs.org/en/download"
  exit 1
fi
echo "Node $(node -v) on $(uname -m)"

say "Removing download quarantine from the project files"
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null || true
chmod +x mac/*.sh

say "Installing project dependencies (a few minutes the first time)"
npm ci --no-audit --no-fund
npx remotion browser ensure

[ -f .env ] || { cp .env.example .env; warn "Created .env from the template — add the ElevenLabs key: open -e .env"; }
chmod 600 .env

say "Claude Code"
if ! command -v claude >/dev/null 2>&1; then
  curl -fsSL https://claude.ai/install.sh | bash
fi
command -v claude >/dev/null 2>&1 && claude --version || warn "Claude Code didn't install — see https://code.claude.com/docs/en/setup"

say "Building '$APP_NAME' on the Desktop"
rm -rf "$APP"
SESSION="$DIR/mac/session.sh"
SESSION_AS=${SESSION//\\/\\\\}; SESSION_AS=${SESSION_AS//\"/\\\"}   # escape for AppleScript string
osacompile -o "$APP" -e "on run
  tell application \"Terminal\"
    activate
    do script \"exec /bin/bash \" & quoted form of \"$SESSION_AS\"
  end tell
end run"

# App icon from mac/icon.png
if [ -f mac/icon.png ]; then
  ICONSET="$(mktemp -d)/AppIcon.iconset"
  mkdir -p "$ICONSET"
  for s in 16 32 128 256 512; do
    sips -z $s $s mac/icon.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
    sips -z $((s * 2)) $((s * 2)) mac/icon.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/applet.icns"
  rm -rf "$(dirname "$ICONSET")"
  touch "$APP"
fi
echo "Created: $APP"

say "Done"
cat <<EOF

Double-click "$APP_NAME" on the Desktop. The first time:
  - macOS asks to let "$APP_NAME" control Terminal → OK
  - Claude asks to sign in → follow the link in the browser
Tip: drag the app into the Dock for one-click access.
EOF
