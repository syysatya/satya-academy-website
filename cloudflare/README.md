# Satya Academy Cloudflare backend (Phase 2)

This is a standalone Worker API, intentionally staged separately from the live site.

## Endpoints
- POST /api/trial — store trial lesson requests in D1
- POST /api/feedback — store feedback in D1
- OPTIONS — CORS preflight

## Security
- Cloudflare Turnstile server-side verification is mandatory.
- API origins are restricted to Satya Academy's domain.
- Inputs are validated and length-limited.
- A honeypot field is included.
- No public read endpoint or admin endpoint is included in this stage.

## Setup
1. Create a Cloudflare D1 database.
2. Run `schema.sql` against the database.
3. Deploy this Worker using Wrangler and bind the database as `DB`.
4. Set `TURNSTILE_SECRET` as a Worker secret.
5. Set `ALLOWED_ORIGIN` to `https://satyaacademy.org`.
6. Configure a Turnstile site key on the website (the public site key is not secret).
7. Test both endpoints before connecting the website forms.

The website UI integration, admin dashboard, email notifications, and custom-domain routing are separate subsequent steps. Do not switch DNS or replace the production site during this phase.
