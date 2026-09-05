# NDW charging-point CORS proxy

The NDW DAFNE charge-point API (`dotnl.ndw.nu`) doesn't send CORS headers,
so the browser can't call it directly from `pricemapp.com`. This Worker
runs the request server-side and adds those headers.

## Deploy (one-time, via the command line)

Cloudflare's dashboard now pushes JavaScript projects towards `wrangler`
instead of the old drag-and-drop / inline editor flow, so use that directly -
it only takes two commands. Run these from this folder
(`cloudflare-worker/`):

```powershell
npx wrangler login
npx wrangler deploy
```

- `wrangler login` opens your browser to sign up / log in to Cloudflare
  (free plan is enough) and authorizes the CLI - one-time.
- `wrangler deploy` reads `wrangler.toml` (already set up in this folder) and
  publishes `ndw-charging-proxy.js`. On success it prints the worker's URL,
  e.g. `https://ndw-charging-proxy.<your-subdomain>.workers.dev`.

To publish a change later (e.g. if `ndw-charging-proxy.js` is edited), just
run `npx wrangler deploy` again from this folder.

## Wire it up

Paste that URL into `script.js` as `chargingProxyUrl` (see the comment
there). The site will then request
`https://ndw-charging-proxy.<your-subdomain>.workers.dev?bbox=<minLon>,<minLat>,<maxLon>,<maxLat>`
and the worker forwards it to NDW and returns the result with CORS enabled.

## Free tier limits

Cloudflare Workers' free plan allows 100,000 requests/day, which is far more
than a small site like this needs. NDW itself caps at 10 requests/second;
the worker caches each bbox at Cloudflare's edge for 15 seconds to stay well
under that even if several people are browsing the map at once.
