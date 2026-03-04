import { chromium, devices } from 'playwright';

const url = 'http://127.0.0.1:4173/';
const shots = [
  { name: 'landing-iphone-13', device: devices['iPhone 13'] },
  { name: 'landing-iphone-se', device: devices['iPhone SE'] }
];

const run = async () => {
  const browser = await chromium.launch();
  for (const shot of shots) {
    const context = await browser.newContext({ ...shot.device });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `/tmp/${shot.name}.png`, fullPage: true });
    await context.close();
  }
  await browser.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
