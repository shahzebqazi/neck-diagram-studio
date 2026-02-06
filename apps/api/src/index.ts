import path from "node:path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import projectsRouter from "./routes/projects";
import libraryRouter from "./routes/library";

const envPath = path.resolve(process.cwd(), "../../.env");

dotenv.config({ path: envPath });
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/projects", projectsRouter);
app.use("/api/library", libraryRouter);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});
