# Cloudflare Pages migration (test branch)

Static website served from `public/`.

## Setup
- Connect GitHub repository to Cloudflare Pages.
- Use branch `cloudflare-migration` for initial test.
- Build command: blank (or `exit 0` if required).
- Build output directory: `public`.
- Root directory: `/`.

## Before changing DNS
1. Test the `*.pages.dev` preview: homepage, responsive layout, links, curriculum modal, WhatsApp, trial/contact/feedback forms.
2. Forms and MeritHub learner-account creation currently rely on Netlify-specific processing/functions and are **not migrated by this static deployment**. Replace these workflows (e.g. Cloudflare Pages Functions and an appropriate form/email backend) and test before switching the domain.
3. Only after forms work, add `satyaacademy.org` and `www` in Cloudflare Pages and follow the DNS instructions. Keep the domain registrar unchanged.
4. Verify HTTPS and both domain variants, merge changes to `main`, and switch the Cloudflare Pages production branch to `main`.
5. Once verified, remove the old Netlify deployment/config if desired.

The `netlify/` folder and `netlify.toml` are intentionally retained during testing for rollback. Never commit API credentials.