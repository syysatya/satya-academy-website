# Dynamic testimonials rollout

## Architecture discovered
The production marketing site is the static HTML site in `public/`, deployed with Netlify. Feedback was submitted through Netlify Forms, which stores submissions in the Netlify Forms inbox; there was no application database or custom admin authentication in this repository. The separate `satya-academy-learning-platform` repo is an independent React/Vite + Hono/Cloudflare D1 scaffold and currently has no production auth.

This implementation adds a Netlify Functions workflow and Netlify Blobs persistence without changing the separate learning-platform scaffold.

## Workflow
- `submit-feedback`: accepts validated website feedback and writes it to Netlify Blobs with `status: pending`, `verified: false`, and a separate publication permission flag.
- `testimonials`: public GET feed. It returns only `status: published` records with explicit permission and returns a minimal public projection.
- `admin-testimonials`: Netlify Identity authenticated administration endpoint, allow-listed by `TESTIMONIAL_ADMIN_EMAILS`. Supports list/stats/search/filter, approve, reject, unpublish, edit and delete. Approve requires explicit publication permission. Editing a published item moves it back to pending review.
- `public/admin-testimonials.html`: admin UI.
- `public/testimonials.html`: all testimonials with course and rating filters.
- Homepage: approved testimonials carousel and feedback form. Existing course curriculum dialog shows testimonials matching the exact course label; no testimonial appears if the course has no published reviews.

## Netlify setup required
1. Deploy this branch to a Netlify deploy preview first.
2. In Netlify, install/enable Netlify Identity for the site. Set registration to invite-only; do not allow public admin registration.
3. Invite the intended administrator email(s). Configure site environment variable:
   - `TESTIMONIAL_ADMIN_EMAILS`: comma-separated exact email allow-list, lowercase preferred.
4. Install the Functions dependency in the deploy environment. The dependency manifest is `netlify/functions/package.json`; if your Netlify build configuration does not install function-local dependencies, move the dependency to the repository root `package.json` or configure the function bundle accordingly.
5. Netlify Blobs is used as the persistence layer. Confirm Blobs is available for the site and that the deploy has its site context. No manual database credentials are needed for the standard Netlify runtime.
6. Confirm Identity invite/login and a test submission in the deploy preview before promoting to production.
7. Open `/admin-testimonials.html` after signing in. Public page is `/testimonials.html`.

## Data model
Each Blobs object uses key `submission:<uuid>` and JSON:
- `id`, `name`, `displayName`, `role`, `course`, `rating`, `feedback`
- `publishPermission` boolean
- `verified` boolean (defaults false; no automatic verification)
- `status`: pending | published | rejected
- `submittedAt`, `approvedAt`, `reviewedBy`, `updatedAt`

No existing Netlify Forms records are migrated automatically. Netlify Forms remains the historic source of submissions. The form on the updated homepage now writes directly to Blobs through the new function.

## Important existing submission requiring identity confirmation
The supplied record for Satyanarayana Yedla / Student / AP Calculus BC / 5 / "I got 5 out of 5 in ap calculus bc" is not seeded or published by this change. It is not present in the Blobs store through this implementation. Preserve the original record in its existing source (Netlify Forms, where it resides) until identity and publication permission are confirmed. If the record is later migrated, set `status: pending` and `verified: false`, never published by default.

## Limitations / follow-up hardening
- The website currently has course curriculum dialogs, not separate canonical course route pages. Course-specific reviews are integrated into those dialogs by exact normalized course label. A proper course URL should pass a course key to the public feed when dedicated pages are introduced.
- Netlify Forms historic submissions need a deliberate export/import operation; do not bulk-import as published.
- Delete is intentionally a permanent admin action and requires browser confirmation.
- Consider adding admin audit-history objects and rate limiting at the edge before broad public launch.
- The Identity widget's identity header is provided by Netlify's trusted Functions runtime; the endpoint also checks the configured email allow-list.
- This code was authored through GitHub API writes. No local Node installation, browser session, Netlify deploy, D1/Blobs runtime, Identity configuration or end-to-end live test was available in this session. Deployment and runtime verification remain outstanding.

## Endpoints
- `POST /.netlify/functions/submit-feedback` — public feedback intake
- `GET /.netlify/functions/testimonials` — public published-only feed
- `GET /.netlify/functions/admin-testimonials?q=&course=&rating=&status=` — admin list and metrics
- `POST /.netlify/functions/admin-testimonials` JSON body `{id, action}`, action: approve | reject | unpublish | delete
- `POST /.netlify/functions/admin-testimonials` JSON body `{id, action:"edit", displayName, feedback}`

## Tests to complete in Netlify deploy preview
- Submit with/without publication permission; verify both remain pending.
- Confirm public feed does not contain pending or rejected records.
- Confirm no-Identity and non-allow-listed Identity requests are denied.
- Approve with permission; verify feed and course dialog show it.
- Attempt to approve without permission; expect HTTP 409.
- Reject, edit, unpublish and delete.
- Test mobile layout, no-results state and temporary function errors.
