# Fika Web Standalone Handoff

This folder is a standalone copy of the web app so it can be maintained in a separate repository without depending on the mobile project structure.

## What is included

- Full web app code from `apps/web` (without build artifacts and `node_modules`)
- Local copies of only the shared modules required by the current web implementation:
  - `src/apis/...` (used request hooks + API paths + speaking types)
  - `src/configs/constants/index.ts`
  - `src/types/apis/app-content/index.ts`

## Run locally

1. `cd deliverables/fika-web-standalone`
2. `npm install`
3. Create `.env.local` from `.env.example` and set values:
   - `NEXT_PUBLIC_ROOT_BE_URL` (default web proxy base is `/api/proxy`)
   - `BE_PROXY_TARGET` (backend host, e.g. `https://be-prod.fikaielts2.com`)
   - `NEXT_PUBLIC_PART2_PREP_SECONDS` (optional test override)
4. `npm run dev`

## Build

- `npm run build`

## Notes

- Existing `apps/web` and mobile code were not modified for this handoff package.
- If you move this folder into a new repository, it should run independently with the env vars above.
