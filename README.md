# Satya Academy — Netlify deployment package

This package preserves the original Claude-generated website and Netlify function, with one deployment-safety adjustment: the public website is in `public/`, while the serverless function source remains outside the publish directory in `netlify/functions/`.

## Deploy with GitHub (recommended)

1. Create a GitHub repository named `satya-academy`.
2. Upload the **contents** of this folder (not the outer ZIP) to the repository root.
3. In Netlify, choose **Add new project → Import an existing project**, connect GitHub, and select the repository.
4. Keep the repository root as the Base directory. Leave the Build command empty. The `netlify.toml` sets the publish directory to `public` and functions directory to `netlify/functions`.
5. Deploy.

## MeritHub environment variables

Do not configure these until the MeritHub API details in `netlify/functions/signup.js` have been checked against the API documentation provided by MeritHub:

- `MERITHUB_CLIENT_ID`
- `MERITHUB_CLIENT_SECRET`
- `MERITHUB_USER_HOST` (optional; defaults to `https://serviceaccount1.meritgraph.com`)

Add them in the Netlify project environment-variable settings. Never put the client secret in `index.html`, GitHub, or a browser-side script.

## Important integration status

The current function contains two `VERIFY` comments: the token request format and the learner-creation payload. These are not yet confirmed. Until they are verified, the static website can be deployed, but the MeritHub trial-registration integration must be treated as untested and not production-ready.
