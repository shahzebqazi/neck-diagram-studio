import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { CANONICAL_LIBRARY_ITEMS } from "@neck-diagram/shared";
import { prisma } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

dotenv.config();

async function main() {
  const existing = await prisma.libraryItem.count();
  if (existing > 0) {
    console.log("Seed skipped: library already populated.");
    return;
  }

  await prisma.libraryItem.createMany({
    data: CANONICAL_LIBRARY_ITEMS.map((item) => ({
      stableId: item.stableId,
      type: item.type,
      name: item.name,
      intervals: item.intervals,
    })),
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
