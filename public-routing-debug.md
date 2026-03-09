# Public routing debug checklist for `bb.keti.eu.org`

## Current known-good local target

Verified stabilized app on this host:

- URL: `http://127.0.0.1:3000`
- Compose service: `web`
- Health: `GET /api/health` returns OK
- App fingerprint:
  - title: `客户管理系统`
  - local `/login` serves directly
  - local build assets include hashes like:
    - `/_next/static/css/42ff927e1ee207a3.css`
    - `/_next/static/chunks/webpack-481bb423fd2e4ce1.js`

## Current public-domain mismatch

Public domain currently serves a different app/runtime:

- URL: `https://bb.keti.eu.org`
- fingerprint:
  - title: `Navigator AICRM - 智能化客户关系管理系统`
  - `/login` -> `307 /auth/login`
  - `/api/auth/session` returns `null`
  - emits `authjs.*` cookies with callback `http://localhost`
  - `_next/static` asset hashes differ from local compose build
- edge:
  - behind Cloudflare
  - DNS resolves to `172.67.151.11` and `104.21.64.133`
  - response headers include `Server: cloudflare`

## Highest-probability cause

Cloudflare is routing `bb.keti.eu.org` to an old origin / old tunnel / old deployment instead of the verified compose app on this host.

## What to check in Cloudflare

### 1. DNS

Check the `bb.keti.eu.org` DNS record(s):

- Is it proxied (orange cloud)?
- What is the origin target?
- Is it pointing to the current host IP?
- Is there a CNAME to a tunnel hostname like `*.cfargotunnel.com`?

### 2. Tunnels

If Cloudflare Tunnel is in use:

- list active tunnels
- find which tunnel maps `bb.keti.eu.org`
- identify which machine currently runs that tunnel
- inspect tunnel ingress rules
- verify the tunnel target port/path
- ensure it points to the current app on port `3000`, not `3005` and not an older app instance

### 3. Load balancer / origin pool

If Cloudflare Load Balancer is in use:

- inspect origin pools
- identify the active origin for `bb.keti.eu.org`
- verify health check target and active origin address

### 4. Workers / Pages / redirects

Check whether any of these override normal origin routing:

- Workers routes
- Bulk redirects / redirect rules
- Transform rules
- Origin rules
- Cache rules
- Pages project custom domain bindings

Especially look for anything rewriting:

- `/login` -> `/auth/login`
- `/api/auth/*`
- `/api/*`

### 5. Cache / stale deployment

Even though responses show `cf-cache-status: DYNAMIC`, still verify:

- no stale worker/pages deployment bound to the domain
- no old origin still reachable behind Cloudflare
- no alternate environment left attached to production hostname

## Fast validation after fix

After retargeting the public domain, these should all become true:

1. `GET https://bb.keti.eu.org/`
   - title becomes `客户管理系统`
2. `GET https://bb.keti.eu.org/login`
   - returns login page directly, not redirect to `/auth/login`
3. `GET https://bb.keti.eu.org/api/health`
   - matches current compose runtime behavior
4. `GET https://bb.keti.eu.org/api/auth/csrf`
   - no longer emits the old `authjs.*` + `http://localhost` pattern inconsistent with current app
5. Seeded account auth smoke works again against public domain:
   - `admin@example.com / admin123`
   - `partner@example.com / partner123`

## Local notes

- Repository `nginx.conf` is stale and proxies to `localhost:3005`; do not treat it as the source of truth for the live stabilized deployment.
- Host checks did not show local listeners on `80`, `443`, or `3005`, and did not reveal a local `cloudflared` service.
- That makes it likely the public routing is owned outside this host.
