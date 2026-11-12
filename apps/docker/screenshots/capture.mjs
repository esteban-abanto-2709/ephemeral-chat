import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://host.docker.internal:3000';
const lang = process.env.SHOT_LANG ?? 'en';
const outDir = process.env.OUT_DIR ?? '/out';

const shots = [
  { name: 'desktop-dark', screen: 'photos', view: 'chat', theme: 'dark', width: 1280, height: 900 },
  { name: 'mobile-light', screen: 'photos', view: 'chat', theme: 'light', width: 390, height: 844 },
  { name: 'mobile-dark', screen: 'qr', view: 'invite', theme: 'dark', width: 390, height: 844 },
];

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  for (const shot of shots) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 2,
    });
    const query = new URLSearchParams({
      screen: shot.screen,
      view: shot.view,
      theme: shot.theme,
      lang,
    });
    await page.goto(`${baseUrl}/design/frame?${query}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    try {
      await page.waitForFunction(() => document.documentElement.classList.contains('liquid'), null, {
        timeout: 15000,
      });
    } catch {
      throw new Error(`${shot.name}: the "liquid" class never appeared; refusing to save frosted glass`);
    }
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    );
    await page.evaluate(() => {
      for (const list of document.querySelectorAll('app-message-list .scroll-glass')) {
        list.scrollTop = list.scrollHeight;
      }
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${outDir}/${shot.name}.png` });
    console.log(`saved ${shot.name}.png`);
    await page.close();
  }
} finally {
  await browser.close();
}
