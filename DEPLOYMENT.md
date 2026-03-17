# Deployment Guide (Vercel + Railway)

This document describes how to deploy this web app to Vercel and connect it to the Railway backend.

- Web app: `ielts-ai`
- Backend URL: `https://ielts-ai-be-production.up.railway.app`

## 1. Confirm backend is live first

Make sure your Railway backend is running and reachable at:

`https://ielts-ai-be-production.up.railway.app`

If backend is down, the web app will deploy but API calls will fail.

## 2. Push code to GitHub

Vercel deploys from GitHub commits. Push your latest web code before deploying.

## 3. Import project in Vercel

1. In Vercel dashboard, click `Add New...` -> `Project`.
2. Use `Import Project` (do not choose a template starter).
3. Select your repository.
4. In project configuration:
   - Framework Preset: `Next.js`
   - Root Directory: `./`
   - Build Command: `npm run build` (or default)
   - Install Command: `npm install` (or default)
   - Output Directory: leave empty

## 4. Set environment variables in Vercel

In Vercel project settings, go to `Settings` -> `Environment Variables` and add:

```env
NEXT_PUBLIC_ROOT_BE_URL=/api/proxy
BE_PROXY_TARGET=https://ielts-ai-be-production.up.railway.app
NEXT_PUBLIC_APP_VERSION=web-0.1.0
NEXT_PUBLIC_PART2_PREP_SECONDS=5
```

Recommended scope for each variable:

- Production: required
- Preview: recommended
- Development: optional

Important:

- Set these at project level (`ielts-ai` project), or ensure team-level vars are explicitly assigned to this project.
- After adding or changing env vars, redeploy.

## 5. Deploy

Click `Deploy`. After success, open the production URL from Vercel.

## 6. Verify proxy-backend connection

This app sends frontend API calls to `/api/proxy/*`, and the Next.js route forwards to `BE_PROXY_TARGET`.

Quick checks after deploy:

1. Open app home page.
2. Trigger a backend-backed action (for example `Refresh` on practice sets).
3. Confirm there are no `502` errors from `/api/proxy/*`.

## 7. After you make code changes

With GitHub connected to Vercel, redeploy is automatic.

Normal workflow:

1. Commit your changes.
2. Push to GitHub.
3. Vercel starts a new deployment automatically.

Branch behavior:

1. Push to `main` -> Production deployment.
2. Push to other branches or open a PR -> Preview deployment.

Manual redeploy is only needed when:

1. You changed environment variables in Vercel.
2. You want to rebuild the same commit without new code changes.

Manual path:

`Project -> Deployments -> Redeploy`
