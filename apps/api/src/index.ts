import path from "node:path";
import dotenv from "dotenv";
import { createApp } from "./app";

const envPath = path.resolve(process.cwd(), "../../.env");

dotenv.config({ path: envPath });
dotenv.config();

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});
