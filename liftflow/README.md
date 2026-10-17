# LiftFlow

Live at https://liftflow.softlockedlive.com

LiftFlow is a Next.js (Pages Router) app built as a static export: `npm run build` writes plain
HTML/CSS/JS to `out/`, and any static file host can serve it. All user data lives in the browser's
localStorage under `liftflow_*` keys, so there is no backend or database. Users move data between
devices with Settings → Export Data / Import Data.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build   # static site in out/
npm run format  # Prettier (VS Code also formats on save)
```

To test on a phone on the same Wi-Fi: `npm run dev -- -H 0.0.0.0`, then open `http://<this PC's IP>:3000`.

Because this is a static export, server-only Next.js features (API routes, `getServerSideProps`,
`redirects` in next.config, image optimization) will fail the build.

## Deploying

The site is served from `/srv/www/liftflow.softlockedlive.com/` on Atlas. To build and publish:

```bash
npm run deploy
```

`scripts/deploy.sh` uploads the build beside the live folder and swaps them, keeping the previous build in
`/srv/www/.liftflow-previous`. To roll back to it:

```bash
ssh atlas 'cd /srv/www && mv liftflow.softlockedlive.com .liftflow-bad && mv .liftflow-previous liftflow.softlockedlive.com && rm -rf .liftflow-bad'
```

## Moving from the old Vercel site

`src/components/MoveNotice.js` shows a banner on `*.vercel.app` asking people to move. "Move my data"
opens the new site with the data in the URL fragment (never sent to a server); the new site asks
before importing it.
