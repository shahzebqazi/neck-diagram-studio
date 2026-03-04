import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import projectsRouter from "./routes/projects";
import libraryRouter from "./routes/library";

type AppOptions = {
  clientOrigin?: string;
};

export const createApp = ({ clientOrigin }: AppOptions = {}) => {
  const app = express();
  const originValue = clientOrigin ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  const originList = originValue
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
  // Security headers: explicit CSP, Referrer-Policy, X-Content-Type-Options, frame protection
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: null
        }
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      noSniff: true,
      frameguard: { action: "deny" },
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

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const message = err instanceof Error ? err.message : "Internal server error";
      const status = message.toLowerCase().includes("cors") ? 403 : 500;
      const safeMessage = status === 500 ? "Internal server error" : message;
      // In production, do not log full error/stack to avoid exposing stack traces in logs
      if (process.env.NODE_ENV === "production") {
        // eslint-disable-next-line no-console
        console.error(safeMessage);
      } else {
        // eslint-disable-next-line no-console
        console.error(err);
      }
      res.status(status).json({ error: safeMessage });
    }
  );

  return app;
};
