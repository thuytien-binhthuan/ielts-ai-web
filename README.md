# IELTS Speaking Web Standalone - Beginner Setup Guide

This guide is for someone with limited experience who needs to run the web app from scratch on a new PC.

## 1. What this project is

- A Next.js web app for IELTS speaking practice.
- It calls backend APIs through a local proxy route (`/api/proxy`).
- Current expected backend for local development: `http://localhost:8010`.

## 2. Install required software (one time)

Install these tools first:

1. Git
2. Node.js LTS (recommended: Node 20 or newer)
3. VS Code (optional but recommended)

After installing Node.js, open a terminal and verify:

```bash
node -v
npm -v
git --version
```

If these commands print versions, you are ready.

## 3. Clone project code

If this standalone folder is in its own repository:

```bash
git clone <YOUR_WEB_REPO_URL>
cd <YOUR_WEB_REPO_FOLDER>
```

If you are still using the original monorepo:

```bash
git clone <YOUR_MONOREPO_URL>
cd <YOUR_MONOREPO_FOLDER>/deliverables/<YOUR_STANDALONE_FOLDER>
```

## 4. Install dependencies

Run:

```bash
npm install
```

## 5. Configure environment file

Create `.env.local` from `.env.example`:

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Git Bash:

```bash
cp .env.example .env.local
```

Use these values in `.env.local`:

```env
NEXT_PUBLIC_ROOT_BE_URL=/api/proxy
NEXT_PUBLIC_APP_VERSION=web-0.1.0
BE_PROXY_TARGET=http://localhost:8010
NEXT_PUBLIC_PART2_PREP_SECONDS=5
```

## 6. Start backend first

Make sure backend is running at:

`http://localhost:8010`

If backend is not running, web will show network errors.

## 7. Start web app

Run:

```bash
npm run web:dev
```

Alternative:

```bash
npm run dev
```

Open:

`http://localhost:3000`

## 8. Build check (optional)

To verify production build:

```bash
npm run build
```

## 9. Common problems and fixes

### Problem: `Missing script: "web:dev"`

Use:

```bash
npm run dev
```

Or pull latest code where `web:dev` script is included.

### Problem: `Port 3000 is in use`

Run on another port:

```bash
npm run web:dev -- --port 3001
```

### Problem: `Unable to acquire lock ... .next/dev/lock`

Another dev server is still running.

- Stop old Node/Next process, then rerun.
- If needed, delete `.next` folder and start again.

### Problem: Turbopack database corruption/panic

Delete `.next` and restart:

PowerShell:

```powershell
Remove-Item -Recurse -Force .next
```

Git Bash:

```bash
rm -rf .next
```

### Problem: `Network Error`

Check:

1. Backend is running at `http://localhost:8010`
2. `BE_PROXY_TARGET` in `.env.local` is correct
3. Restart web app after changing env file

## 10. Daily workflow

1. Pull latest code: `git pull`
2. Start backend
3. Start web: `npm run web:dev`
4. Test in browser
5. Commit your changes
