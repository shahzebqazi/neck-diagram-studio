import path from "node:path";
import dotenv from "dotenv";
import { prisma } from "./db";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

dotenv.config();

const libraryItems = [
  { type: "scale", name: "Major (Ionian)", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { type: "scale", name: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { type: "scale", name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
  { type: "scale", name: "Melodic Minor", intervals: [0, 2, 3, 5, 7, 9, 11] },
  { type: "scale", name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9] },
  { type: "scale", name: "Minor Pentatonic", intervals: [0, 3, 5, 7, 10] },
  { type: "scale", name: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
  { type: "mode", name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { type: "mode", name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { type: "mode", name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { type: "mode", name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { type: "mode", name: "Locrian", intervals: [0, 1, 3, 5, 6, 8, 10] },
  { type: "position", name: "Position 1", intervals: [] },
  { type: "position", name: "Position 2", intervals: [] },
  { type: "position", name: "Position 3", intervals: [] },
  { type: "position", name: "Position 4", intervals: [] },
  { type: "position", name: "Position 5", intervals: [] },
  { type: "position", name: "1-12", intervals: [] },
  { type: "position", name: "12-24", intervals: [] },
  { type: "position", name: "Whole Neck", intervals: [] }
];

const keys = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
].map((name) => ({
  type: "key",
  name,
  intervals: []
}));

async function main() {
  const existing = await prisma.libraryItem.count();
  if (existing > 0) {
    console.log("Seed skipped: library already populated.");
    return;
  }

  await prisma.libraryItem.createMany({
    data: [...libraryItems, ...keys]
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
