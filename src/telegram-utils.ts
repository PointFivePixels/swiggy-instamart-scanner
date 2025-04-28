import { Telegraf } from 'telegraf';
import fs from 'fs/promises';
import { TelegramConfig } from './types.js';
import { database } from './db-utils.js';

export class TelegramBot {
  private bot: Telegraf;
  private channelId: string;

  constructor(config: TelegramConfig) {
    if (!config.botToken) {
      throw new Error('Bot token is required');
    }
    if (!config.channelId) {
      throw new Error('Channel ID is required');
    }

    this.bot = new Telegraf(config.botToken, { handlerTimeout: 90_000 });
    this.channelId = config.channelId;
  }

  async start(): Promise<void> {
    try {
      console.log('Starting Telegram bot...');
      await database.init();

      // Simple test message to verify connectivity
      // await this.bot.telegram.sendMessage(this.channelId, '🤖 Bot is starting...');

      console.log('Test message sent successfully');
    } catch (error) {
      console.error('Failed to start bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.bot.stop();
      console.log('Bot stopped successfully');
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  }

  async sendProductUpdate(data: any, screenshotPath: string): Promise<void> {
    try {
      const message = this.formatMessage(data);
      const fileId = database.generateId(screenshotPath);

      // Check if this post was already sent
      const alreadySent = await database.wasPostSent(fileId, data.location.name);
      if (alreadySent) {
        console.log(`Skipping duplicate post: ${data.product.name}`);

        // Delete the screenshot file
        try {
          await fs.unlink(screenshotPath);
          console.log(`Successfully deleted: ${screenshotPath}`);
        } catch (error) {
          console.error(`Failed to delete screenshot: ${screenshotPath}`, error);
        }
        return;
      }

      if (await this.ensureFileExists(screenshotPath)) {
        // Send photo to Telegram
        await this.bot.telegram.sendPhoto(
          this.channelId,
          { source: screenshotPath },
          { caption: message, parse_mode: 'Markdown' }
        );

        // Record the sent post in database
        await database.addSentPost({
          id: fileId,
          locationName: data.location.name,
          categoryName: data.product.name,
          productName: data.product.name,
        });

        // Delete the screenshot file
        try {
          await fs.unlink(screenshotPath);
          console.log(`Successfully deleted: ${screenshotPath}`);
        } catch (error) {
          console.error(`Failed to delete screenshot: ${screenshotPath}`, error);
        }
      } else {
        await this.bot.telegram.sendMessage(this.channelId, message, {
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      console.error('Failed to send product update:', error);
      throw error;
    }
  }

  private async ensureFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private formatMessage(data: any): string {
    const { location, product } = data;
    return (
      `🛒 *New Deal Alert in ${location.name}!*\n\n` +
      `*${product.name}*\n` +
      `📝 ${product.description}\n` +
      `💰 MRP: ₹${product.mrp}\n` +
      `🏷️ *${product.discountPercentage}% OFF*\n` +
      `✨ *Deal Price: ₹${product.discountedPrice}*\n` +
      (product.unit ? `📦 Unit: ${product.unit}\n` : '') +
      (product.origin ? `🏠 Origin: ${product.origin}\n` : '')
    );
  }
}
