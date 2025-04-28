import { chromium, Browser, BrowserContext, Page, devices } from 'playwright';
import { Location } from './types.js';

interface BrowserSetup {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function launchBrowser(location?: Location): Promise<BrowserSetup> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: location
      ? { latitude: location.latitude, longitude: location.longitude }
      : { latitude: 21.2229397, longitude: 72.7908737 },
    ...devices['iPad Mini'],
    // isMobile: true,
    // hasTouch: true,
  });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeBrowser({ browser, context, page }: BrowserSetup): Promise<void> {
  await page.close();
  await context.close();
  await browser.close();
}
