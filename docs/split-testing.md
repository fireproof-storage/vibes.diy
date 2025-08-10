## Netlify Split Testing: Developer Opt‑in via Cookie (no redirects)

This app supports Netlify Split Testing so developers can opt into an alternate branch deploy while staying on the main domain. Because the origin does not change, browser storage (localStorage, sessionStorage, cookies) is preserved across versions.

### How it works

- Netlify routes traffic between eligible branch deploys at the CDN proxy layer.
- Visitors are bucketed by the `nf_ab` cookie. When present, Netlify serves all content for that visitor from the selected branch deploy on the main domain.
- We ship a tiny pre‑mount script that reads query parameters on arrival and sets/clears the `nf_ab` cookie before the app initializes, then reloads once so the CDN picks up the selection.

### Opt in

Open the primary site URL with one of the following query parameters:

- `?nf_ab=<branch-name>` — sets the cookie to the exact branch name and reloads.
- `?ab=<branch-name>` — synonym for convenience.

Example:

```
https://vibes.diy/?nf_ab=feature-new-ui
```

After reload, Netlify will proxy all requests for that browser to the `feature-new-ui` branch deploy at `https://vibes.diy/...` (no redirect).

### Opt out / revert

Open the primary site URL with any of the following to clear the bucket:

- `?nf_ab=clear` (aliases: `off`, `reset`, `none`)
- `?ab=clear`

This removes the cookie and reloads once. Without the cookie, Netlify serves the primary branch (e.g., `main`). If you want to force the primary branch explicitly, you can also set `?nf_ab=main` (or your production branch name).

### Important limitations

- Split Testing only supports persistent branch deploys. Deploy Previews (per‑PR) cannot be targeted by `nf_ab`.
- When Split Testing is enabled for a site, Netlify does not execute Edge Functions for that site. If you rely on Edge Functions, enable Split Testing only when acceptable for your routes.
- Storage schema compatibility: both branches share the same origin storage. If you change localStorage structure on one branch, ensure the other can tolerate or migrate it.

### Configuration required in Netlify

Split Testing is configured at the site level in the Netlify UI. Include your production branch (e.g., `main`) and at least one experimental branch deploy. Do not add PR Deploy Previews. Traffic allocation can be 0/100 — the cookie opt‑in will still work.

### Open questions

- Which branch deploy(s) should be eligible for opt‑in right now?
- Do we want different query parameter names or additional aliases?

Edit this doc once those choices are finalized.
