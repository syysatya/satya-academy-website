# Satya Academy Cloudflare backend (staging)

Worker API and static assets for staging. Keep the production domain/DNS unchanged until testing is complete.

## Routes
- POST /api/trial
- POST /api/feedback
- OPTIONS preflight for API routes
- Other paths are served from the `public/` static asset directory

## Configuration
- Wrangler configuration: `wrangler.jsonc`
- D1 binding: `DB` (satya-academy-db)
- Static assets binding: `ASSETS`
- Secret: `TURNSTILE_SECRET`
- Optional variable: `ALLOWED_ORIGIN` (defaults to https://satyaacademy.org)

## Security and validation
- Server-side Turnstile verification required
- Origin allow-list for the apex and www domains
- Input validation and length limits
- Honeypot handling
- No public read or admin endpoint in this stage

## Deployment/testing
1. Confirm the D1 binding in the Wrangler configuration matches the Cloudflare database.
2. Configure Turnstile site and secret keys for the staging deployment.
3. Deploy to a staging Worker using Wrangler.
4. Test the API endpoints and static website before connecting website forms or changing DNS.
