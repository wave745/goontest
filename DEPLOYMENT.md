# Vercel Deployment Guide

This guide covers deploying your full-stack application (React frontend + Express backend) to Vercel using serverless functions.

## Overview

The application is configured as a monorepo that deploys both frontend and backend to Vercel:
- **Frontend**: Vite + React (static files served from CDN)
- **Backend**: Express.js API running as Vercel serverless functions

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket
3. **Environment Variables**: Prepare all required API keys and secrets (see below)

## Quick Start

### 1. Push to Git

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

### 2. Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Select your repository
4. **Framework Preset**: Other (or Vite)
5. Leave build settings as default (Vercel will use package.json scripts)

### 3. Configure Environment Variables

In your Vercel project settings, add these environment variables:

#### Required Variables

```bash
# Database (use Neon, Supabase, or other PostgreSQL provider)
DATABASE_URL=postgresql://user:password@host:port/database

# OpenAI API Key (for AI chat features)
OPENAI_API_KEY=sk-...

# Solana Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# DigitalOcean Spaces (for file uploads)
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_REGION=nyc3
DO_SPACES_KEY=your-access-key
DO_SPACES_SECRET=your-secret-key

# LiveKit (for live streaming)
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret

# X.AI API Key (if using xAI instead of OpenAI)
XAI_API_KEY=your-xai-key
```

#### Optional Frontend Variables

```bash
# API URL (only if deploying frontend and backend separately)
VITE_API_URL=https://your-app.vercel.app
```

### 4. Deploy

Click "Deploy" in Vercel dashboard. The build process will:
1. Install dependencies
2. Build the frontend (`npm run build:client`)
3. Build the backend (`npm run build:server`)
4. Deploy serverless functions to `/api` routes
5. Deploy static frontend to CDN

## Build Configuration

The project uses these npm scripts (already configured in package.json):

```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

Vercel automatically runs `npm run build` during deployment.

## Project Structure

```
project/
├── api/
│   └── index.ts          # Serverless function entry point
├── client/               # React frontend
├── server/
│   ├── app.ts           # Express app configuration
│   ├── index.ts         # Development server
│   ├── routes.ts        # API routes
│   └── ...
├── shared/              # Shared types/schemas
├── vercel.json          # Vercel configuration
├── .vercelignore        # Files to exclude
└── package.json
```

## How It Works

### Frontend Routing
- All non-API routes serve the React SPA
- Static assets cached with long TTL
- SPA fallback to index.html for client-side routing

### Backend Routing
- All `/api/*` routes handled by serverless functions
- Express app runs in Vercel's Node.js runtime
- Requests routed to `api/index.ts`

## Important Limitations

### Serverless Function Constraints

1. **Execution Time**: 
   - Free tier: 10 second timeout
   - Pro tier: 60 second timeout (configurable in vercel.json)

2. **File Uploads**:
   - ⚠️ **Cannot store files in serverless functions**
   - **Must use cloud storage** (DigitalOcean Spaces, AWS S3, etc.)
   - The app is already configured to use DigitalOcean Spaces

3. **WebSockets**:
   - ⚠️ Traditional WebSockets don't work in serverless
   - Use LiveKit (already configured) for live streaming
   - Use polling or Server-Sent Events for real-time updates

4. **Memory**:
   - Default: 1024 MB
   - Configurable in vercel.json

5. **Cold Starts**:
   - First request after idle may be slower
   - Subsequent requests are fast

## Environment-Specific Configuration

### Development (.env.local)

```bash
DATABASE_URL=postgresql://localhost:5432/mydb
OPENAI_API_KEY=sk-...
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
# ... other vars
```

### Production (Vercel Dashboard)

Set all environment variables in:
**Project Settings → Environment Variables**

## Database Setup

### Option 1: Neon (Recommended for Vercel)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Vercel as `DATABASE_URL`

### Option 2: Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings → Database
3. Add to Vercel as `DATABASE_URL`

### Running Migrations

After deployment, run database migrations:

```bash
# Using Drizzle
npm run db:push
```

Or use Vercel CLI:

```bash
vercel env pull .env.production
npm run db:push
```

## Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown
4. SSL certificate auto-generated

## Monitoring & Logs

### View Logs

1. Vercel Dashboard → Your Project
2. Click on Deployment
3. View "Functions" tab for serverless logs
4. View "Build" tab for build logs

### Error Tracking

Consider integrating:
- Sentry for error tracking
- Vercel Analytics for performance monitoring

## Troubleshooting

### Build Fails

**Check build logs** in Vercel dashboard:
- Missing dependencies? Update package.json
- TypeScript errors? Run `npm run check` locally
- Environment variables missing? Add in Vercel settings

### API Returns 404

1. Verify routes start with `/api/`
2. Check `vercel.json` routing configuration
3. Ensure `api/index.ts` exports properly

### Database Connection Errors

1. Verify `DATABASE_URL` is set in Vercel
2. Check database allows connections from Vercel IPs
3. Use connection pooling (Neon/Supabase auto-configured)

### File Upload Errors

1. Ensure DigitalOcean Spaces credentials are set
2. Verify bucket has correct CORS configuration
3. Check bucket permissions

### CORS Issues

Backend automatically handles CORS. If issues persist:
1. Check browser console for specific CORS errors
2. Verify frontend URL is correct
3. Add custom CORS headers in `server/app.ts` if needed

## Performance Optimization

### Frontend

1. **Enable Compression**: Vercel auto-compresses
2. **Image Optimization**: Use Vercel Image Optimization
3. **Code Splitting**: Vite handles automatically
4. **CDN**: All static assets served from global CDN

### Backend

1. **Connection Pooling**: Use serverless-compatible DB
2. **Caching**: Implement Redis or Vercel KV for caching
3. **Function Size**: Keep bundles small (exclude dev deps)
4. **Region**: Deploy to region closest to users

## Costs

### Free Tier Includes:
- 100GB bandwidth/month
- Unlimited projects
- Unlimited deployments
- Serverless function executions

### Paid Plans:
- **Pro**: $20/month (better performance, higher limits)
- **Enterprise**: Custom pricing

Monitor usage in Vercel Dashboard → Usage

## Advanced Configuration

### Custom Build Command

Edit `vercel.json`:

```json
{
  "buildCommand": "npm run build:client && npm run build:server"
}
```

### Function Configuration

Edit `vercel.json`:

```json
{
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 10,
      "runtime": "nodejs20.x"
    }
  }
}
```

### Region Selection

Edit `vercel.json`:

```json
{
  "regions": ["iad1", "sfo1"]
}
```

## Rollback

If a deployment fails:

1. Go to Deployments in Vercel
2. Find previous successful deployment
3. Click "..." menu → "Promote to Production"

## Local Testing with Vercel CLI

Install Vercel CLI:

```bash
npm i -g vercel
```

Test locally (simulates Vercel environment):

```bash
vercel dev
```

Deploy preview:

```bash
vercel
```

Deploy to production:

```bash
vercel --prod
```

## CI/CD

Vercel auto-deploys on:
- **Push to main/master**: Production deployment
- **Pull requests**: Preview deployments
- **Other branches**: Can configure in settings

## Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use environment variables for all secrets
3. ✅ Enable Vercel's Web Application Firewall (Pro)
4. ✅ Implement rate limiting in API routes
5. ✅ Use HTTPS only (Vercel enforces this)
6. ✅ Validate all user inputs
7. ✅ Keep dependencies updated

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: support@vercel.com
- **Community**: [vercel.com/community](https://vercel.com/community)

---

**Ready to deploy?** Push your code and import to Vercel! 🚀
