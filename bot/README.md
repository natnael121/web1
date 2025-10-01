# Multi-Shop Telegram Bot

A Telegram bot that handles shop-specific Mini App links and provides order management for the Multi-Shop system.

## Features

- **Shop-Specific Links**: Handle `https://t.me/YourBot?start=SHOP_ID` links
- **Product Links**: Handle `https://t.me/YourBot?start=SHOP_ID_product_PRODUCT_ID` links
- **Order Notifications**: Send real-time order notifications to shop departments
- **User Registration**: Automatically register Telegram users in Firebase
- **Admin Commands**: Special commands for shop owners and admins
- **Inline Queries**: Search and share shops via inline mode

## Setup Instructions

### 1. Install Dependencies

```bash
cd bot
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `TELEGRAM_BOT_TOKEN`: Your bot token from @BotFather
- `TELEGRAM_BOT_USERNAME`: Your bot username (without @)
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `MINI_APP_URL`: Your deployed Mini App URL

### 3. Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Save the JSON file as `serviceAccountKey.json` in the bot directory

### 4. Bot Commands Setup

Set up bot commands with @BotFather:

```
start - Start the bot and browse shops
shops - View all available shops
myorders - View your order history
help - Show help information
admin - Admin panel (for shop owners)
```

### 5. Run the Bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Bot Commands

### User Commands

- `/start` - Welcome message and shop directory
- `/start SHOP_ID` - Direct link to specific shop
- `/shops` - Browse all available shops
- `/myorders` - View order history
- `/help` - Show help information

### Admin Commands

- `/admin` - Access admin panel (shop owners only)

## Features

### Shop-Specific Links

The bot handles these link formats:

1. **Shop Links**: `https://t.me/YourBot?start=SHOP_ID`
   - Opens the specific shop's catalog
   - Shows shop info, categories, and featured products

2. **Product Links**: `https://t.me/YourBot?start=SHOP_ID_product_PRODUCT_ID`
   - Opens the specific product details
   - Shows product info with option to view in Mini App

### Order Notifications

When orders are placed through the Mini App:

1. **New Order Notifications**: Sent to all active departments
2. **Status Updates**: Sent to customers when order status changes
3. **Admin Notifications**: Special notifications for shop owners

### User Management

- **Auto Registration**: Users are automatically registered in Firebase
- **Profile Updates**: User info is kept in sync with Telegram
- **Role Management**: Supports customer, shop_owner, and admin roles

## Integration with Mini App

### Webhook Endpoints

The bot provides webhook endpoints for integration:

- `POST /webhook/order` - Send new order notifications
- `POST /webhook/order-status` - Send order status updates
- `GET /health` - Health check endpoint

### Example Webhook Usage

```javascript
// Send new order notification
const response = await fetch('https://your-bot-server.com/webhook/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order: orderData,
    departments: departmentsList
  })
});

// Send order status update
const response = await fetch('https://your-bot-server.com/webhook/order-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order: orderData,
    status: 'confirmed'
  })
});
```

## Deployment

### Option 1: Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Option 2: Heroku

1. Create a new Heroku app
2. Add environment variables
3. Deploy using Git or GitHub integration

### Option 3: VPS/Server

1. Clone repository on your server
2. Install dependencies: `npm install`
3. Set up environment variables
4. Use PM2 for process management: `pm2 start index.js`

## Troubleshooting

### Common Issues

1. **Bot not responding**:
   - Check if bot token is correct
   - Verify bot is not already running elsewhere
   - Check Firebase connection

2. **Mini App not opening**:
   - Verify MINI_APP_URL is correct
   - Check if Mini App is properly deployed
   - Ensure HTTPS is enabled

3. **Order notifications not working**:
   - Check department Telegram chat IDs
   - Verify bot has access to group chats
   - Check webhook endpoints

4. **Firebase connection issues**:
   - Verify serviceAccountKey.json is correct
   - Check Firebase project ID
   - Ensure Firestore is enabled

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=telegram-bot-api
```

## Security Notes

- Keep your bot token secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your Firebase service account keys
- Monitor bot usage and implement rate limiting if needed

## Support

For issues and questions:
- Check the logs for error messages
- Verify all environment variables are set correctly
- Test bot commands manually in Telegram
- Check Firebase console for data issues