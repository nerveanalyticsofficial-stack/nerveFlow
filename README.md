# Nerve Analytics website

A portfolio website for Nerve Analytics with an editor at `/admin`. The public site presents services, selected projects, the founding team, and contact information. Each project and published founder has a dedicated page.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The public website reads `content/site.json` until a GitHub token is configured. To use the admin locally, copy `.env.example` to `.env.local` and fill in real values. The same API routes run locally and as Vercel Functions after deployment.

## Deploy to Vercel

1. Import this GitHub repository as a new Vercel project. Vercel should detect the Vite framework. The build command is `npm run build`, and the output directory is `dist`.
2. Add these environment variables in **Project Settings → Environment Variables** for Production (and Preview if desired):

   | Variable | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | A unique password of at least 12 characters |
   | `SESSION_SECRET` | A random secret of at least 32 characters |
   | `GITHUB_TOKEN` | A fine-grained GitHub token with **Contents: Read and write** access to this repository |
   | `GITHUB_OWNER` | `nerveanalyticsofficial-stack` |
   | `GITHUB_REPO` | `nerveFlow` |
   | `GITHUB_BRANCH` | `main` |

3. Deploy. Visit `/admin` on the deployed URL and sign in. Keep the three secrets private; never add them to the repository.

The admin saves edits to `content/site.json` through the GitHub API. Public pages read the latest content through a Vercel Function, so copy changes are available immediately. The image uploader stores images in `public/uploads` in the repository and serves them through an image endpoint; it works with public or private repositories. Vercel may also redeploy after each admin edit because the repository receives a new commit.

## Before sharing with clients

The founder names, biographies, photos, contact email, WhatsApp number, and booking link were not provided in the brief. The three founder records are ready in the admin but unpublished. Complete them and toggle each profile on. Replace the provisional contact email before using the site with clients. The reference to “RHS dominoles” needs clarification before it can be described accurately.

## Content and security

- The admin session uses an HttpOnly, SameSite cookie signed with `SESSION_SECRET`.
- Mutating requests check the request origin, and uploads are limited to 2 MB image files.
- Set a long admin password and restrict the GitHub token to this repository.
- The site does not publish unverified customer names, results, or statistics.
