# CI/CD with GitHub Actions

This directory contains workflow files for automated deployment.

## Available Workflows

### 1. Deploy Backend to DigitalOcean

**File**: `deploy-backend.yml`

Automatically deploys backend to DigitalOcean when you push to the `main` branch.

**Setup:**

1. Add secrets to your GitHub repository:

   - `DIGITALOCEAN_ACCESS_TOKEN`
   - `DO_REGISTRY_NAME`
   - All environment variables (DB_PASSWORD, etc.)

2. Push to main branch to trigger deployment

### 2. Deploy Frontend to Vercel

**File**: `deploy-frontend.yml`

Automatically deploys frontend to Vercel when you push to the `main` branch.

**Setup:**

1. Install Vercel GitHub integration
2. Or add these secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

## Manual Workflows

You can also trigger workflows manually from the Actions tab in GitHub.

## Testing

Workflows run automatically on:

- Push to `main` branch
- Pull requests (for testing only)

## Status Badges

Add to your README.md:

```markdown
![Backend Deploy](https://github.com/imsidkg/exness/actions/workflows/deploy-backend.yml/badge.svg)
![Frontend Deploy](https://github.com/imsidkg/exness/actions/workflows/deploy-frontend.yml/badge.svg)
```
