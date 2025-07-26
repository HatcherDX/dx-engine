# GitHub Pages Deployment

This documentation site is automatically deployed to [hatche.rs](https://hatche.rs) using GitHub Actions.

## Setup Instructions

### 1. Configure GitHub Pages

1. Go to your repository's Settings > Pages
2. Set Source to "GitHub Actions"
3. The custom domain `hatche.rs` should be automatically configured from the CNAME file

### 2. DNS Configuration

To use the custom domain `hatche.rs`, you need to configure DNS records:

```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153

Type: AAAA
Name: @
Value: 2606:50c0:8000::153
Value: 2606:50c0:8001::153
Value: 2606:50c0:8002::153
Value: 2606:50c0:8003::153

Type: CNAME
Name: www
Value: hatcherdx.github.io
```

### 3. Automatic Deployment

The site automatically deploys when:

- Code is pushed to the `main` branch
- The workflow can also be triggered manually from GitHub Actions

### 4. Local Development

```bash
# Start development server
pnpm --filter @hatcherdx/dx-engine-docs dev

# Build for production (with GitHub Pages settings)
pnpm --filter @hatcherdx/dx-engine-docs build:pages

# Build from root
pnpm run build:docs
```

### 5. Workflow Files

- `.github/workflows/deploy-docs.yml` - Deployment workflow
- `apps/docs/public/CNAME` - Custom domain configuration
- `apps/docs/public/.nojekyll` - Prevents Jekyll processing
- `apps/docs/public/robots.txt` - SEO configuration

The deployment workflow includes:

- ✅ Automatic sitemap generation
- ✅ Clean URLs
- ✅ Custom domain configuration
- ✅ SEO optimization
- ✅ Artifact caching for faster deployments
