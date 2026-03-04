import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:5173";
const OUT = join(import.meta.dirname, "../apps/web/public/screenshots");
const IPHONE = { width: 390, height: 844 };

const THEMES = [
  { id: "", label: "default" },
  { id: "jaffa-cake", label: "jaffa-cake" },
  { id: "light", label: "light" },
  { id: "catputtchin", label: "catputtchin" },
  { id: "high-contrast", label: "high-contrast" },
  { id: "fifties", label: "fifties" },
  { id: "oled-blackout", label: "oled-blackout" },
];

const WORKSHEETS = [
  { btn: "Shape sharing (6-str)", dir: "shape-sharing" },
  { btn: "8-str sweep arpeggios", dir: "sweep-arpeggios" },
  { btn: "A Harm. Minor & modes", dir: "harmonic-minor" },
];

function jsClick(page, text) {
  return page.evaluate((t) => {
    const btn = [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === t);
    if (btn) { btn.click(); return true; }
    return false;
  }, text);
}

async function setTheme(page, themeId) {
  await page.evaluate((id) => {
    document.documentElement.dataset.theme = id;
    localStorage.setItem("neck-diagram:theme", id);
  }, themeId);
  await page.waitForTimeout(300);
}

async function toggleSidebar(page, open) {
  const label = open ? "Open sidebar" : "Close sidebar";
  await jsClick(page, label);
  await page.waitForTimeout(400);
}

async function loadWorksheet(page, worksheetName) {
  // Open sidebar
  await toggleSidebar(page, true);

  // Scroll sidebar to bottom
  await page.evaluate(() => {
    const sb = document.querySelector(".sidebar");
    if (sb) sb.scrollTop = sb.scrollHeight;
  });
  await page.waitForTimeout(300);

  // Click the worksheet button
  let ok = await jsClick(page, worksheetName);
  if (!ok) { console.log("  WARNING: worksheet button not found:", worksheetName); return false; }
  await page.waitForTimeout(500);

  // Click "Set as current worksheet"
  ok = await jsClick(page, "Set as current worksheet");
  if (!ok) { console.log("  WARNING: 'Set as current worksheet' not found"); return false; }
  await page.waitForTimeout(500);

  // Scroll sidebar again to find render button
  await page.evaluate(() => {
    const sb = document.querySelector(".sidebar");
    if (sb) sb.scrollTop = sb.scrollHeight;
  });
  await page.waitForTimeout(200);

  // Click "Render diagrams on canvas"
  ok = await jsClick(page, "Render diagrams on canvas");
  if (!ok) { console.log("  WARNING: 'Render' button not found"); return false; }
  await page.waitForTimeout(800);

  // Close sidebar
  await toggleSidebar(page, false);
  return true;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: IPHONE,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  for (const ws of WORKSHEETS) {
    const dir = join(OUT, ws.dir);
    mkdirSync(dir, { recursive: true });

    console.log(`\n--- Loading worksheet: ${ws.btn} ---`);
    const loaded = await loadWorksheet(page, ws.btn);
    if (!loaded) {
      console.log("  Skipping screenshots (worksheet not loaded)");
    }

    for (const theme of THEMES) {
      console.log(`  Theme: ${theme.label}`);
      await setTheme(page, theme.id);
      await page.screenshot({ path: join(dir, `${theme.label}.png`), type: "png" });
    }
  }

  // Sidebar screenshots
  const sidebarDir = join(OUT, "sidebar");
  mkdirSync(sidebarDir, { recursive: true });
  await toggleSidebar(page, true);
  await page.waitForTimeout(400);

  for (const theme of THEMES) {
    console.log(`  Sidebar theme: ${theme.label}`);
    await setTheme(page, theme.id);
    await page.screenshot({ path: join(sidebarDir, `${theme.label}.png`), type: "png" });
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to:", OUT);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
