import { createApp } from "../server/app";

let appPromise: ReturnType<typeof createApp> | null = null;

// Initialize the app once
async function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }
  const { app } = await appPromise;
  return app;
}

// Export the Express app for Vercel
export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
