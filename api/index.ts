import express from "express";
import { registerRoutes } from "../server/routes";

// Create a simple Express app for Vercel
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register routes
registerRoutes(app);

// Export the Express app for Vercel
export default app;
