# Vercel Deployment - Quick Start

## 🚀 Ready to Deploy!

Your project is now configured for Vercel deployment. Here's what you need to do:

### 1. Push to Git
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

### 2. Deploy to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build:client`
5. **Output Directory**: `dist/public`
6. **Install Command**: `npm install`

### 3. Set Environment Variable
In your Vercel project settings, add:
```
VITE_API_URL=https://your-backend-domain.com
```

### 4. Deploy!
Click "Deploy" and wait for the build to complete.

## 📁 What Was Created

- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to exclude from deployment
- `DEPLOYMENT.md` - Detailed deployment guide
- `deploy.sh` - Build script
- Updated `package.json` with build scripts
- Updated API client to use environment variables

## 🔧 Build Commands

- `npm run build:client` - Build frontend for Vercel
- `npm run build:server` - Build backend (deploy separately)
- `./deploy.sh` - Run deployment preparation script

## 📖 Full Documentation

See `DEPLOYMENT.md` for complete deployment instructions and troubleshooting.
