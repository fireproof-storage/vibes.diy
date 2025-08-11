## Netlify Split Testing: Developer Opt‑in via Cookie (no redirects)

This app supports Netlify Split Testing so developers can opt into an alternate branch deploy while staying on the main domain. Because the origin does not change, browser storage (localStorage, sessionStorage, cookies) is preserved across versions.

### How it works

- Netlify routes traffic between eligible branch deploys at the CDN proxy layer.
- Visitors are bucketed by the `nf_ab` cookie. When present, Netlify serves all content for that visitor from the selected branch deploy on the main domain.
- We ship a tiny pre‑mount script that reads the `ab=` query parameter on arrival and sets/clears the `nf_ab` cookie before the app initializes, then reloads once so the CDN picks up the selection.

### Opt in

Open the primary site URL with:

- `?ab=<branch-name>` — sets the cookie to the exact branch name and reloads.

Example:

```
https://vibes.diy/?ab=feature-new-ui
```

After reload, Netlify will proxy all requests for that browser to the `feature-new-ui` branch deploy at `https://vibes.diy/...` (no redirect).

### Opt out / revert

Open the primary site URL with the following to clear the bucket:

- `?ab=clear` (aliases: `off`, `reset`, `none`)

This removes the cookie and reloads once. Without the cookie, Netlify serves the primary branch (e.g., `main`). If you want to force the primary branch explicitly, you can also set `?ab=main` (or your production branch name).

### Important limitations

- Split Testing only supports persistent branch deploys. Deploy Previews (per‑PR) cannot be targeted by the cookie‑based Split Testing mechanism (`nf_ab`).
- When Split Testing is enabled for a site, Netlify does not execute Edge Functions for that site. If you rely on Edge Functions, enable Split Testing only when acceptable for your routes.
- Storage schema compatibility: both branches share the same origin storage. If you change localStorage structure on one branch, ensure the other can tolerate or migrate it.

#### Cookie scope (apex vs subdomains)

By default, the `nf_ab` cookie is set without a `Domain` attribute. That means it is host‑scoped and will not be shared across hosts like `vibes.diy` and `www.vibes.diy`. If you need the same selection to apply across subdomains, consider setting a cookie `Domain` (for example, `Domain=.vibes.diy`). Doing so shares the bucket across all subdomains but also broadens the cookie’s reach. Evaluate privacy and collision trade‑offs before enabling.

This repository ships the default host‑scoped behavior. If cross‑subdomain behavior is desired, we can add an option to include a `Domain` attribute in the cookie setter; please confirm the desired scope on the PR.

### Configuration required in Netlify

Split Testing is configured at the site level in the Netlify UI. Include your production branch (e.g., `main`) and at least one experimental branch deploy. Do not add PR Deploy Previews. Traffic allocation can be 0/100 — the cookie opt‑in will still work.

<!-- The public docs intentionally document only the `ab=` query parameter. The code continues to accept other aliases for compatibility, but those are not documented. -->
