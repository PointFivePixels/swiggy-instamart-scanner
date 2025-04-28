export interface Location {
  latitude: number;
  longitude: number;
  name: string;
  enabled: boolean;
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
  categories: { name: string; enabled: boolean }[];
  telegram: TelegramConfig;
}

export interface ProductScanResult {
  location: Location;
  category: string;
  productsFound: number;
  errors?: Error[];
  telegramMessagesSent?: number;
}
