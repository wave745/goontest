# Deployment Guide

## Vercel Frontend Deployment

This project is configured for frontend-only deployment on Vercel. The backend should be deployed separately.

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Ensure your code is pushed to GitHub/GitLab/Bitbucket
3. **Backend Server**: Deploy your backend to a platform like:
   - DigitalOcean Droplet
   - Railway
   - Render
   - Heroku
   - AWS/GCP

### Frontend Deployment Steps

1. **Import Project to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Select the repository

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:client`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

3. **Environment Variables**:
   Set these in your Vercel project settings:
   ```
   VITE_API_URL=https://your-backend-domain.com
   ```
   Replace `your-backend-domain.com` with your actual backend server URL.

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your frontend

### Backend Deployment

Since this is a full-stack application, you'll need to deploy the backend separately:

1. **Build the backend**:
   ```bash
   npm run build:server
   ```

2. **Deploy to your chosen platform**:
   - **DigitalOcean**: Create a droplet and deploy the `dist/` folder
   - **Railway**: Deploy the entire project and set environment variables
   - **Render**: Deploy as a web service

3. **Set backend environment variables**:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `OPENAI_API_KEY`
   - `SOLANA_NETWORK`
   - `SOLANA_RPC_URL`
   - `PORT`
   - `NODE_ENV=production`

### Environment Variables Reference

#### Frontend (Vercel)
- `VITE_API_URL`: Your backend server URL (e.g., `https://api.yourapp.com`)

#### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `SOLANA_NETWORK`: Solana network (devnet/mainnet)
- `SOLANA_RPC_URL`: Solana RPC endpoint
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (production)

### Post-Deployment

1. **Update DNS**: Point your domain to Vercel
2. **Test API calls**: Ensure frontend can communicate with backend
3. **Monitor logs**: Check Vercel and backend logs for errors
4. **Set up custom domain**: Configure in Vercel project settings

### Troubleshooting

- **Build failures**: Check build logs in Vercel dashboard
- **API errors**: Verify `VITE_API_URL` is correct
- **CORS issues**: Ensure backend allows requests from Vercel domain
- **Environment variables**: Double-check all variables are set correctly

### Notes

- The frontend is configured to make API calls to the backend using the `VITE_API_URL` environment variable
- Static assets are served from Vercel's CDN
- The backend handles all API requests and database operations
- Session management is handled by the backend
