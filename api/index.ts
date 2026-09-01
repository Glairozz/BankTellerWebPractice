// Vercel Serverless entry point.
// Mounts the compiled Express app (built by `npm run build` at the repo root).
// Requests to /api/* are rewritten here by vercel.json.
import { app } from "../apps/api/dist/app.js";

export default app;
