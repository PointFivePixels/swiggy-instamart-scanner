import { Page } from 'playwright';
import { launchBrowser } from './playwright-utils.js';
import { extractProductDetails } from './utils.js';
import { Config, Location, ProductScanResult } from './types.js';
import { TelegramBot } from './telegram-utils.js';
import { config as dotenvConfig } from 'dotenv';
import configJson from './config.json' with { type: 'json' };

// Load environment variables
dotenvConfig();

// Validate Telegram configuration
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChannel = process.env.TELEGRAM_CHANNEL_ID;

if (!telegramToken || !telegramChannel) {
  console.error('Missing required Telegram configuration!');
  console.error('Please ensure TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are set in .env file');
  process.exit(1);
}

const config: Config = {
  ...configJson,
  telegram: {
    botToken: telegramToken,
    channelId: telegramChannel,
  },
};

class InstamartScraper {
  private readonly config: Config;
  private currentLocation: Location | null = null;
  private telegramBot: TelegramBot;
  private messageSentCount: number = 0;

  constructor(config: Config) {
    this.config = config;
    this.telegramBot = new TelegramBot(config.telegram);
    console.log(config.telegram);
  }

  private async navigateToCategory(
    page: Page,
    category: Config['categories'][number]
  ): Promise<void> {
    try {
      const categoryName = category.name;
      await page.locator(`button[aria-label="${categoryName}"]`).click({ timeout: 5_000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Get sub-categories if they exist
      const subCategories = await page.evaluate(() => {
        return [...document.querySelectorAll('div > ul > li')]
          .map((x: Element) => (x as HTMLElement).innerText)
          .filter(Boolean);
      });

      // TODO -> Skip if sub-categories are not found
      if (subCategories.length > 100) {
        // Process each sub-category
        for (const subCategory of subCategories) {
          try {
            console.log(`Processing sub-category: ${subCategory}`);
            // Click the sub-category
            await page.locator(`li:has-text("${subCategory}")`).click();
            await page.waitForLoadState('networkidle');

            // Apply sorting
            await this.applySorting(page);

            // Process products for this sub-category
            await this.getDiscountedProducts(page, false);
          } catch (error) {
            console.error(`Error processing sub-category ${subCategory}:`, error);
          }
        }
      } else {
        // If no sub-categories, just apply sorting for main category
        await this.applySorting(page);
      }
    } catch (error) {
      throw new Error(`Failed to navigate to category ${category.name}: ${error}`);
    }
  }

  private async applySorting(page: Page): Promise<void> {
    try {
      await page
        .locator('div[data-testid="dropdown-chip"]:has-text("Sort By")')
        .click({ timeout: 3_000 });

      const radioButton = page.getByText('Discount (High To Low)');
      await radioButton.waitFor({ state: 'attached' });

      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 'input[id=sort-chip-dropdown-2]');

      await page.waitForTimeout(500);
      await radioButton.waitFor({ state: 'visible' });
      await radioButton.click();
      await page.waitForLoadState('networkidle');
    } catch (error) {
      console.error('Error applying sorting:', error);
    }
  }

  private async captureProductDetails(
    productContainer: any,
    discountPercentage: number
  ): Promise<void> {
    const formattedProductName = await productContainer.innerText();
    const productName = formattedProductName.replace(/\n/g, ' ➡️ ');
    const productDetails = extractProductDetails(productName);

    if (!productDetails) {
      console.error('Failed to extract product details');
      return;
    }

    const sanitizedName = productDetails.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const locationName = this.currentLocation?.name.toLowerCase() || 'unknown';
    const screenshotPath = `screenshots/${locationName}_${sanitizedName}_${discountPercentage}off.png`;

    await productContainer.screenshot({ path: screenshotPath });

    try {
      await this.telegramBot.sendProductUpdate(
        {
          location: this.currentLocation,
          product: productDetails,
        },
        screenshotPath
      );
      this.messageSentCount++;
    } catch (error) {
      console.error('Failed to send product update to Telegram:', error);
    }
  }

  private async scanProductsInView(page: Page, processedProducts: Set<string>): Promise<number> {
    const discountElements = await page
      .locator('[data-testid="item-offer-label-discount-text"]')
      .all();

    let newProductsFound = 0;

    for (const discountElement of discountElements) {
      const discountText = (await discountElement.textContent()) || '';
      const discountPercentage = parseInt(discountText);

      if (discountPercentage >= this.config.minDiscountPercentage) {
        console.log(`Found product with ${discountPercentage}% discount`);
        const productContainer = await discountElement.locator(
          'xpath=ancestor::*[@data-testid="ItemWidgetContainer"]'
        );

        const formattedProductName = await productContainer.innerText();
        const productName = formattedProductName.replace(/\n/g, ' ➡️ ');
        const productDetails = extractProductDetails(productName);
        if (!productDetails) {
          console.error('Failed to extract product details');
          continue;
        }
        const productId =
          productDetails?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() ||
          Math.random().toString(36).substring(2, 15);

        if (!processedProducts.has(productId)) {
          await this.captureProductDetails(productContainer, discountPercentage);
          processedProducts.add(productId);
          newProductsFound++;
        }
      }
    }

    return newProductsFound;
  }

  private async getDiscountedProducts(page: Page, shouldGoBack: boolean = true): Promise<number> {
    let totalProducts = 0;
    let previousHeight = 0;
    let noNewProductsCount = 0;
    const processedProducts = new Set<string>();

    while (
      totalProducts < this.config.maxProductsPerCategory &&
      noNewProductsCount < this.config.maxScrollAttempts
    ) {
      const newProducts = await this.scanProductsInView(page, processedProducts);
      totalProducts += newProducts;

      if (newProducts === 0) {
        noNewProductsCount++;
      } else {
        noNewProductsCount = 0;
      }

      const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);

      if (currentHeight === previousHeight) {
        noNewProductsCount++;
      }

      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(this.config.scrollWaitTime);
    }

    if (shouldGoBack) {
      await page.locator('[data-testid="simpleheader-back"]').click();
      await this.handleTryAgainButton(page);
      await page.waitForLoadState('networkidle');
    }
    return totalProducts;
  }

  private async handleTryAgainButton(page: Page): Promise<void> {
    try {
      // Set timeout for 3 seconds (3000 ms)
      await page.reload({ waitUntil: 'networkidle' });
      const tryAgainButton = page.getByText('Try Again');

      if (await tryAgainButton.isVisible({ timeout: 3000 })) {
        console.log('Found "Try Again" button, attempting to click...');
        await tryAgainButton.click({ timeout: 3000 });
        await page.waitForLoadState('networkidle');
      }
    } catch (error) {
      console.log('No "Try Again" button found or error clicking it:', error);
    }
  }

  private async scanLocation(location: Location): Promise<ProductScanResult[]> {
    const results: ProductScanResult[] = [];
    this.currentLocation = location;
    this.messageSentCount = 0;

    const { browser, context, page } = await launchBrowser(location);

    try {
      await page.goto('https://www.swiggy.com/instamart');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Handle potential "Try Again" button after initial load
      await this.handleTryAgainButton(page);

      try {
        await page.locator('[data-testid="set-gps-button"]').click({ force: true });
      } catch (error) {
        console.error('Error clicking GPS button:', error);
        // Handle potential "Try Again" button after GPS error
        await this.handleTryAgainButton(page);
      }

      await page.waitForLoadState('networkidle');

      for (const category of this.config.categories.filter((cat) => cat.enabled)) {
        try {
          await this.navigateToCategory(page, category);
          // Handle potential "Try Again" button after category navigation
          await this.handleTryAgainButton(page);
          await page.waitForTimeout(2000);

          const productsFound = await this.getDiscountedProducts(page);
          results.push({
            location,
            category: category.name,
            productsFound,
            telegramMessagesSent: this.messageSentCount,
          });
        } catch (error) {
          console.error(`Error processing category ${category}:`, error);
          // Handle potential "Try Again" button after error
          await this.handleTryAgainButton(page);
          results.push({
            location,
            category: category.name,
            productsFound: 0,
            telegramMessagesSent: this.messageSentCount,
            errors: [error as Error],
          });
        }
      }
    } catch (error) {
      console.error(`Error processing location ${location.name}:`, error);
    } finally {
      await context.close();
      await browser.close();
    }

    return results;
  }

  async start(): Promise<ProductScanResult[]> {
    try {
      await this.telegramBot.start();
      const allResults: ProductScanResult[] = [];

      for (const location of this.config.locations.filter((loc) => loc.enabled)) {
        console.log(`\nProcessing location: ${location.name}`);
        const locationResults = await this.scanLocation(location);
        allResults.push(...locationResults);
      }

      return allResults;
    } catch (error) {
      console.error('Error during scanning process:', error);
      return [];
    }
  }
}

// Run the automation
async function runWithRetry() {
  while (true) {
    try {
      console.log('\n=== Starting new scan session ===');
      const scraper = new InstamartScraper(config);
      const results = await scraper.start();

      for (const result of results) {
        if (result.errors?.length) {
          console.error(`Errors encountered: ${result.errors.map((e) => e.message).join(', ')}`);
        }
      }

      // Wait for 2 minutes before starting the next scan
      console.log('\n=== Scan complete. Waiting 1 minutes before next scan... ===');
      await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000));
    } catch (error) {
      console.error('An error occurred:', error);
      console.log('\n=== Restarting after error in 30 seconds... ===');
      // Wait for 30 seconds before retrying after an error
      await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
    }
  }
}

// Replace the main function with the infinite running version
async function main() {
  console.log('Starting Swiggy Instamart Scanner in infinite mode...');
  await runWithRetry();
}

main().catch(console.error);
