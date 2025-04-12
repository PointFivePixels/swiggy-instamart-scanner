# 🛍️ Swiggy Instamart Deal Scanner

An automated tool that scans Swiggy Instamart for the best deals and sends notifications through Telegram.

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=Playwright&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

## 🌟 Features

- 🤖 Automated scanning of Swiggy Instamart deals
- 📍 Multi-location support
- 🔄 Continuous monitoring with auto-retry
- 📱 Real-time Telegram notifications
- 📸 Product screenshots included in notifications
- 🎯 Customizable discount thresholds
- 🗂️ Category-based scanning
- 🔄 Duplicate post prevention
- 🛡️ Error handling and recovery

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Telegram bot token and channel ID

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd SwiggyPlaywright
```

2. Install dependencies:

```bash
npm install
```

3. Create a .env file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=your_channel_id_here
```

4. Configure locations and categories in `src/config.json`:

```json
{
  "minDiscountPercentage": 60,
  "maxProductsPerCategory": 25,
  "maxScrollAttempts": 1,
  "scrollWaitTime": 1000,
  "locations": [
    {
      "latitude": 12.9715987,
      "longitude": 77.594566,
      "name": "Bangalore"
    }
  ],
  "categories": ["Fresh Vegetables", "Fresh Fruits"]
}
```

### Usage

Run the scanner:

```bash
npm run instamart
```

## ⚙️ Configuration

| Parameter                | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `minDiscountPercentage`  | Minimum discount percentage to trigger notification      |
| `maxProductsPerCategory` | Maximum products to scan per category                    |
| `maxScrollAttempts`      | Number of scroll attempts before moving to next category |
| `scrollWaitTime`         | Wait time between scrolls (in milliseconds)              |
| `locations`              | Array of locations to scan                               |
| `categories`             | Array of categories to scan                              |

## 🏗️ Project Structure

```
├── src/
│   ├── config.json         # Configuration file
│   ├── instamart.ts        # Main scraper logic
│   ├── telegram-utils.ts   # Telegram bot utilities
│   ├── playwright-utils.ts # Browser automation utilities
│   ├── db-utils.ts        # Database utilities
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Helper functions
├── screenshots/           # Product screenshots directory
└── db.json               # Local database file
```

## 🤖 How It Works

1. The scanner launches a Playwright browser instance for each configured location
2. It navigates through specified categories on Swiggy Instamart
3. Scans for products with discounts meeting the minimum threshold
4. Captures screenshots and product details
5. Sends notifications to the configured Telegram channel
6. Prevents duplicate notifications within a 3-hour window
7. Automatically retries on errors and continues scanning

## ⚠️ Disclaimer

This tool is for educational purposes only. Please ensure compliance with Swiggy's terms of service and implement appropriate rate limiting.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
