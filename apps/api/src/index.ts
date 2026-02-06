import path from "node:path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import projectsRouter from "./routes/projects";
import libraryRouter from "./routes/library";

const envPath = path.resolve(process.cwd(), "../../.env");

dotenv.config({ path: envPath });
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const originList = clientOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (originList.length === 0) {
  originList.push("http://localhost:5173");
}
if (originList.includes("*")) {
  throw new Error("CLIENT_ORIGIN must not include wildcard origins when credentials are enabled.");
}

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || originList.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: false, parameterLimit: 1000 }));

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method)
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/projects", writeLimiter, projectsRouter);
app.use("/api/library", libraryRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = message.toLowerCase().includes("cors") ? 403 : 500;
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(status).json({ error: status === 500 ? "Internal server error" : message });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});
