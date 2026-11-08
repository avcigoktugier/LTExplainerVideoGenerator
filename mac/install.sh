#!/bin/bash
# One line in Terminal installs everything on a Mac:
#   curl -fsSL https://raw.githubusercontent.com/avcigoktugier/LTExplainerVideoGenerator/master/mac/install.sh | bash
# Downloads the project to ~/LTVideo (or updates it), then runs mac/setup-mac.sh.
# Safe to run again: after installing Node.js or the developer tools it asks for, just paste the line again.
set -euo pipefail
REPO="https://github.com/avcigoktugier/LTExplainerVideoGenerator.git"
DIR="$HOME/LTVideo"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!  %s\033[0m\n' "$*"; }

[ "$(uname)" = "Darwin" ] || { echo "Bu kurulum Mac içindir."; exit 1; }

say "Geliştirici araçları (git)"
if ! xcode-select -p >/dev/null 2>&1; then
  warn "Apple'ın geliştirici araçları gerekiyor. Açılan pencerede 'Yükle'ye basın, bitince bu satırı tekrar yapıştırın."
  xcode-select --install || true
  exit 1
fi

say "Node.js"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  warn "Node.js 22 gerekiyor. İndirme sayfası açılıyor: 'macOS Installer (.pkg)' indirip kurun, sonra bu satırı tekrar yapıştırın."
  open "https://nodejs.org/en/download"
  exit 1
fi

say "Proje"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull -q --rebase origin master || warn "Güncelleme alınamadı, mevcut kopya kullanılıyor."
else
  git clone -q "$REPO" "$DIR"
fi

# the pipe gives this script no keyboard; hand the setup the Terminal itself so it can ask for the keys
bash "$DIR/mac/setup-mac.sh" </dev/tty
