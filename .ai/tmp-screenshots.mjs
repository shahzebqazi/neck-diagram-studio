import { chromium } from "playwright";
import fs from "fs/promises";

const outDir = "/tmp/neck-diagram-screens";
const sizes = [
  { name: "mobile-375x812", width: 375, height: 812 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "laptop-1280x800", width: 1280, height: 800 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "wide-1920x1080", width: 1920, height: 1080 }
];

await fs.mkdir(outDir, { recursive: true });

const fallbackPath =
  "/Users/sqazi/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await chromium.launch({
  headless: true,
  executablePath: fallbackPath
});

for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#root", { timeout: 10000 });
  await page.waitForTimeout(2000);
  const path = `${outDir}/${size.name}.png`;
  await page.screenshot({ path, fullPage: true });
  await context.close();
}

await browser.close();

console.log(`Saved screenshots to ${outDir}`);
