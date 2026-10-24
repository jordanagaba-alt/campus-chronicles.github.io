# Campus Chronicles: GitHub Pages + shared publishing API

GitHub Pages cannot execute `server.js`. Deploy the static site to GitHub Pages and deploy this Node API to a Node host (Render, Railway, Fly.io, etc.). The API is the shared source of truth for published stories; drafts remain in the editor's browser.

## 1. Deploy the API

1. Push this project to a GitHub repository.
2. Create a Node web service from that repository. Set its root directory to the folder containing `server.js`, build command `npm install`, start command `npm start`.
3. Add environment variable `ADMIN_TOKEN` with a long random secret (at least 24 characters). Do not put this secret in GitHub or `api-config.js`.
4. Set `DATA_FILE` to a path on a persistent disk attached to the service, for example `/var/data/stories.json`. Attach/mount that disk at `/var/data`. Without persistent storage, a JSON file may be lost on redeploy/restart depending on the host.
5. After deployment, test `https://YOUR-API-HOST/api/health` and `https://YOUR-API-HOST/api/stories`.
6. Set `ALLOWED_ORIGINS` to the exact GitHub Pages origin, e.g. `https://YOUR-USERNAME.github.io`. For a project site the path is not included in the origin.

## 2. Connect GitHub Pages

1. Edit `api-config.js` and set `window.CC_API_BASE` to your deployed API URL, without a trailing slash.
2. Commit and push the website files. Enable GitHub Pages in repository Settings → Pages.
3. Keep `server.js`, `package.json`, and this setup guide in the repository if convenient; GitHub Pages serves them as downloads but does not run the server.

## 3. Publishing

- Visitors can read the same published stories from `/api/stories`.
- On the first publish/delete in a browser session, the editor asks for `ADMIN_TOKEN`. The token is stored in session storage for that tab/session only.
- Published time is assigned by the server and shown as `49s ago`, `12m ago`, etc. The date field remains the editorial publication date.
- Drafts are local to the browser and are not shared. A proper multi-editor system with private accounts would require authentication and per-user draft storage.

## 4. Local API development

```sh
npm install
# Set ADMIN_TOKEN in your shell before starting; do not commit secrets.
npm start
```

On PowerShell:

```powershell
$env:ADMIN_TOKEN = 'use-a-long-random-secret-here-please'
$env:ALLOWED_ORIGINS = '*'
npm start
```

Then set `window.CC_API_BASE = 'http://localhost:3000'` in `api-config.js` while developing locally. Use HTTPS for production. The included JSON-file store is intended for a single API instance with persistent disk; for multiple replicas, use a shared database instead.
