#!/bin/bash
# One video-editing session, started by "KetTek Video.app":
#   1. starts the preview service (if it isn't already running)
#   2. opens the preview (localhost:3000) and videos (localhost:3001) in the browser
#   3. starts Claude in the project folder
#   4. when Claude is closed (or this window), stops the service it started
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR" || exit 1
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

printf '\033]0;LT Video\007'   # window title
clear

up() { curl -s -o /dev/null -m 2 http://localhost:3000/; }
pause_exit() { echo; read -r -p "Kapatmak için Enter'a basın..." _; exit 1; }

if [ ! -d node_modules ]; then
  echo "Kurulum tamamlanmamış (node_modules yok). Kurulumu yapan kişiye haber verin: kurulum satırı tekrar çalıştırılmalı."
  pause_exit
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code bulunamadı. Kurulumu yapan kişiye haber verin: kurulum satırı tekrar çalıştırılmalı."
  pause_exit
fi

SERVER=""
cleanup() {
  if [ -n "$SERVER" ] && kill -0 "$SERVER" 2>/dev/null; then
    echo
    echo "Stüdyo kapatılıyor..."
    kill -TERM -- "-$SERVER" 2>/dev/null   # the whole service: npm, node, Studio
    for _ in 1 2 3 4 5; do kill -0 "$SERVER" 2>/dev/null || break; sleep 1; done
    kill -KILL -- "-$SERVER" 2>/dev/null
  fi
  [ -n "$FINISHED" ] && echo "Görüşmek üzere! Bu pencereyi kapatabilirsiniz."
}
FINISHED=""
trap cleanup EXIT
trap 'exit 0' HUP INT TERM   # window closed / Ctrl+C → still clean up

# pick up changes others made (new scenes, fixes) before starting; never block the session on it
git pull -q --rebase --autostash origin master >/dev/null 2>&1 || true

if up; then
  echo "Stüdyo zaten açık."
else
  echo "Stüdyo başlatılıyor, lütfen bekleyin..."
  mkdir -p out
  set -m                                   # own process group, so cleanup stops all of it
  npm run server </dev/null >>out/server.log 2>&1 &
  SERVER=$!
  set +m
  for _ in $(seq 1 90); do
    up && break
    kill -0 "$SERVER" 2>/dev/null || break
    sleep 1
  done
fi

# Studio needs a modern browser (Safari 16.4+); prefer Chrome when it's installed
browse() { open -a "Google Chrome" "$1" 2>/dev/null || open "$1" 2>/dev/null; }

if up; then
  browse "http://localhost:3001"
  browse "http://localhost:3000"
  sleep 1
  osascript -e 'tell application "Terminal" to activate' >/dev/null 2>&1   # bring Claude back to the front
else
  echo "Önizleme açılamadı. Kurulumu yapan kişiye şu dosyayı gönderin: $DIR/out/server.log"
  pause_exit
fi

clear
cat <<'EOF'

  Law & Trust video stüdyosu
  ─────────────────────────
  Önizleme : http://localhost:3000   (değişiklikten sonra sayfayı yenileyin)

  Ne istediğinizi aşağıya Türkçe yazın. Video hazır olunca "videoyu render al" deyin:
  video internette (GitHub'da) hazırlanır, birkaç dakika sonra MASAÜSTÜNE iner.
  Bitince /exit yazın ya da bu pencereyi kapatın.

EOF
claude
FINISHED=1
