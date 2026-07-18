import dotenv from "dotenv";
import express, { type Express, type Request, type Response } from "express";
import path from "node:path";

dotenv.config({ path: "backend/.env" });

const app: Express = express();

// Render index.html in frontend directory
app.use(express.static(path.join(import.meta.dirname, "..", "frontend")));

app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Service is healthy",
    environment: process.env.NODE_ENV ?? "development",
  });
});

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`App is running at http://localhost:${port}`);
});
