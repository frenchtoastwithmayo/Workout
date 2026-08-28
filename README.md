# Squad Lift Tracker

A workout tracker for you and two friends. Log lifts, track progressive overload,
see a GitHub-style consistency grid, and compete on a "most improved" leaderboard.

No accounts, no passwords — each person just picks their name once and it's
remembered on their device. Everyone shares the same data, so keep the link
private to just the three of you.

## What's inside

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`) — one small file
  database, no separate database server to run.
- **Frontend:** plain HTML/CSS/JS + Chart.js from a CDN — no build step.
- **Data:** stored in `data/squad.db`. Back this file up if you care about
  your history — it's the entire database.

## Run it locally first

```bash
npm install
npm start
```

Then open `http://localhost:3000`. First person to open it should go to the
**Squad** tab and rename "You" / "Friend 2" / "Friend 3" to your actual names
before anyone logs a workout.

## Hosting it for real (recommended: Railway or Render)

Both are free/cheap, deploy straight from a GitHub repo, and don't require you
to manage a server. Either works well here — pick whichever you land on.

### Option A — Railway
1. Push this folder to a GitHub repo (private is fine).
2. On [railway.app](https://railway.app), **New Project → Deploy from GitHub repo**, pick the repo.
3. Railway detects the `Dockerfile` automatically and builds it.
4. Add a **Volume** in the service settings, mounted at `/app/data` — this is
   what makes your workout history survive re-deploys. Without it, every
   deploy wipes the database.
5. Once deployed, Railway gives you a public URL (e.g. `your-app.up.railway.app`).
   Share that link with your two friends.

### Option B — Render
1. Push this folder to a GitHub repo.
2. On [render.com](https://render.com), **New → Web Service**, connect the repo.
3. Render will detect the `Dockerfile`. Set the instance type to the free tier
   to start.
4. Add a **Disk** (Render's term for a persistent volume) mounted at `/app/data`.
5. Deploy, then share the `.onrender.com` URL it gives you.

> Free tiers on both platforms sometimes "sleep" the app after inactivity —
> the first load after a while idle can take a few seconds. That's normal.

### Option C — Your own VPS (Docker)
```bash
docker build -t squad-lift .
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  --name squad-lift \
  squad-lift
```
Put a reverse proxy (Caddy or nginx) in front of it for HTTPS and a real
domain if you want something nicer than `http://your-ip:3000`. Caddy is the
easiest — a single line in a `Caddyfile` (`yourdomain.com { reverse_proxy
localhost:3000 }`) gets you free auto-renewing HTTPS.

### Option D — Your own VPS (no Docker)
```bash
# needs Node 18+ installed
npm install --omit=dev
npm install -g pm2
pm2 start server.js --name squad-lift
pm2 save
pm2 startup   # follow the printed instructions so it survives a reboot
```

## A note on privacy

There's no login — anyone with the URL can see and log workouts as any of the
three members. That's fine for a private link only the three of you have, but
don't post the URL anywhere public. If you ever want real per-person
passwords, that's a solid next step to add.

## Backing up your data

The whole app's history lives in one file: `data/squad.db`. Copy it somewhere
safe occasionally (e.g. `scp` it off your VPS, or download it from your
platform's volume/disk browser) if you want peace of mind.
