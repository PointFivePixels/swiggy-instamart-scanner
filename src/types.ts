export interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

export interface TelegramConfig {
  botToken: string;
  channelId: string;
}

export interface Config {
  minDiscountPercentage: number;
  maxProductsPerCategory: number;
  maxScrollAttempts: number;
  scrollWaitTime: number;
  locations: Location[];
  categories: string[];
  telegram: TelegramConfig;
}

export interface ProductScanResult {
  location: Location;
  category: string;
  productsFound: number;
  errors?: Error[];
  telegramMessagesSent?: number;
}
