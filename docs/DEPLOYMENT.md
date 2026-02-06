# Deployment

## Hosting
- The web app is intended to be hosted on GitLab Pages.
- Use the custom domain `neckdiagramstudio.com`.

## Demo branch
- Maintain the demo page on a dedicated GitLab branch separate from `main`.

## Production API
- Set `VITE_API_BASE` in the web build environment to point to the API origin.
- Configure CORS on the API to allow the production web origin.
