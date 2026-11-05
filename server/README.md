# Putting the pipeline on a server

Result: one Linux account (`video`) that people SSH into. Logging in drops them in the project with a short help message; they run `claude` and talk. A service keeps Remotion Studio (preview, :3000) and an exports/download page (:3001) running permanently, and rebuilds a project's timeline whenever its storyboard is saved. Both ports are only reachable through the SSH tunnel.

Guide for the person editing videos: `server/KULLANIM.md` (Turkish). Running it on your own Windows PC instead (via Tailscale)? See `server/README-windows.md`.

## Requirements
- Ubuntu 22.04/24.04 or Debian 12, root/sudo access.
- **Recommended: 2+ CPU cores, 4 GB RAM.** Preview works on less, but rendering a 60 s video needs memory. With less than 4 GB the setup adds a 4 GB swap file; renders will still work, just slowly.
- Outbound internet (npm, Chrome download, ElevenLabs, Claude).

## 1. Create the login account (once)
```bash
sudo adduser video
sudo mkdir -p /home/video/.ssh
# paste each person's PUBLIC key (id_ed25519.pub), one per line:
sudo nano /home/video/.ssh/authorized_keys
sudo chown -R video:video /home/video/.ssh && sudo chmod 700 /home/video/.ssh && sudo chmod 600 /home/video/.ssh/authorized_keys
```

## 2. Upload the project (from your PC)
Upload the clean project zip (no `node_modules` — Windows modules don't work on Linux) and your `.env`:
```powershell
scp kettek-explainer-server.zip video@SERVER_IP:~
scp .env video@SERVER_IP:~/
```
On the server:
```bash
cd ~ && unzip -o kettek-explainer-server.zip && mv ~/.env ~/kettek-explainer/.env
```

## 3. Run setup (once, ~5 min)
```bash
sudo bash ~/kettek-explainer/server/setup.sh video
```
It installs Node 22, Chrome's libraries, ffmpeg, project dependencies, Claude Code, the `kettek-studio` service and the login message. Safe to re-run.

## 4. First login
```bash
ssh -L 3000:localhost:3000 -L 3001:localhost:3001 video@SERVER_IP
claude        # first time: open the login link and sign in
```
Open http://localhost:3000 and http://localhost:3001.

## Day to day
| Task | Command (on the server) |
|---|---|
| Restart preview | `sudo systemctl restart kettek-studio` |
| Service logs | `sudo journalctl -u kettek-studio -n 50` |
| Update code from a new zip | unzip over the folder, then `npm ci && sudo systemctl restart kettek-studio` |

## Security notes
- Ports 3000/3001 are blocked from outside by an iptables rule the service adds on start; access is via SSH only.
- Everyone who can log in as `video` can read `.env` (API keys) and run anything as that user. Give access only to people you trust.
- Each person should sign in to Claude Code with their **own** Claude account.
