# Deployment

## Hosting
- The web app is hosted on GitLab Pages.
- **Custom domain:** `neckdiagramstudio.com` is configured and verified (HTTPS via Let's Encrypt).

### Custom domain DNS (complete)
- **Registrar:** GoDaddy.
- **Records:** A `@` → `35.185.44.232`, AAAA `@` → `2600:1901:0:7b8a::`, TXT `_gitlab-pages-verification-code` (and optional root TXT) for verification.
- **Verification:** Domain ownership verified in GitLab (Deploy → Pages). Remove any duplicate A record that pointed to GoDaddy Website Builder so only the GitLab A record remains for the root domain.

## Demo branch
- Maintain the demo page on a dedicated GitLab branch separate from `main`.

## Production API
- Set `VITE_API_BASE` in the web build environment to point to the API origin.
- Configure CORS on the API to allow the production web origin.
