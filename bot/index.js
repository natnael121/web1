const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Express app for webhooks (optional)
const app = express();
app.use(express.json());

class MultiShopBot {
  constructor() {
    this.setupCommands();
    this.setupCallbacks();
    this.setupInlineQueries();
  }

  setupCommands() {
    // Start command handler
    bot.onText(/\/start(.*)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const user = msg.from;
      const startParam = match[1]?.trim();

      console.log(`Start command from ${user.first_name} (${user.id}) with param: ${startParam}`);

      try {
        // Register/update user in database
        await this.registerUser(user);

        if (startParam) {
          await this.handleStartParam(chatId, user, startParam);
        } else {
          await this.sendWelcomeMessage(chatId, user);
        }
      } catch (error) {
        console.error('Error handling start command:', error);
        bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
      }
    });

    // Help command
    bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpText = `
🤖 *Multi-Shop Bot Help*

*Commands:*
/start - Start the bot and open shop directory
/shops - Browse all available shops
/myorders - View your order history
/help - Show this help message

*Features:*
🛍️ Browse multiple shops
📱 Mini App interface
🛒 Shopping cart
📦 Order tracking
🔔 Order notifications

*How to use:*
1. Use /start to open the shop directory
2. Browse shops and products
3. Add items to your cart
4. Contact shops to place orders

*For Shop Owners:*
Contact @YourSupportUsername to set up your shop.
      `;

      bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    });

    // Shops command
    bot.onText(/\/shops/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendShopsList(chatId);
    });

    // My orders command
    bot.onText(/\/myorders/, async (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;
      await this.sendUserOrders(chatId, user.id);
    });

    // Admin commands
    bot.onText(/\/admin/, async (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;
      
      if (await this.isAdmin(user.id)) {
        await this.sendAdminPanel(chatId);
      } else {
        bot.sendMessage(chatId, '❌ You don\'t have admin permissions.');
      }
    });
  }

  setupCallbacks() {
    // Handle callback queries from inline keyboards
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data;
      const user = callbackQuery.from;

      console.log(`Callback query: ${data} from ${user.first_name} (${user.id})`);

      try {
        await bot.answerCallbackQuery(callbackQuery.id);

        if (data.startsWith('shop_')) {
          const shopId = data.replace('shop_', '');
          await this.handleShopSelection(chatId, user, shopId, messageId);
        } else if (data.startsWith('category_')) {
          const [, shopId, category] = data.split('_');
          await this.handleCategorySelection(chatId, user, shopId, category, messageId);
        } else if (data.startsWith('product_')) {
          const productId = data.replace('product_', '');
          await this.handleProductSelection(chatId, user, productId, messageId);
        } else if (data.startsWith('order_')) {
          const orderId = data.replace('order_', '');
          await this.handleOrderDetails(chatId, user, orderId, messageId);
        } else if (data === 'back_to_shops') {
          await this.sendShopsList(chatId, messageId);
        } else if (data === 'open_miniapp') {
          await this.sendMiniAppButton(chatId);
        }
      } catch (error) {
        console.error('Error handling callback query:', error);
        bot.sendMessage(chatId, '❌ Something went wrong. Please try again.');
      }
    });
  }

  setupInlineQueries() {
    // Handle inline queries for sharing
    bot.on('inline_query', async (inlineQuery) => {
      const query = inlineQuery.query.toLowerCase();
      const results = [];

      try {
        if (query.includes('shop')) {
          // Search shops
          const shops = await this.searchShops(query);
          
          shops.forEach((shop, index) => {
            results.push({
              type: 'article',
              id: `shop_${shop.id}`,
              title: shop.name,
              description: shop.description,
              input_message_content: {
                message_text: `🛍️ *${shop.name}*\n\n${shop.description}\n\n🔗 [Open Shop](https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${shop.id})`,
                parse_mode: 'Markdown'
              },
              reply_markup: {
                inline_keyboard: [[
                  { text: '🛍️ Open Shop', url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${shop.id}` }
                ]]
              }
            });
          });
        }

        await bot.answerInlineQuery(inlineQuery.id, results, { cache_time: 300 });
      } catch (error) {
        console.error('Error handling inline query:', error);
        await bot.answerInlineQuery(inlineQuery.id, []);
      }
    });
  }

  async registerUser(telegramUser) {
    try {
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('telegramId', '==', telegramUser.id).get();

      if (userQuery.empty) {
        // Create new user
        const userData = {
          telegramId: telegramUser.id,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || '',
          username: telegramUser.username || '',
          languageCode: telegramUser.language_code || 'en',
          role: 'customer',
          settings: {
            notifications: {
              email: false,
              push: true,
              telegram: true
            },
            telegram: {
              chatId: telegramUser.id.toString(),
              username: telegramUser.username || '',
              enableNotifications: true
            },
            theme: 'auto',
            language: telegramUser.language_code || 'en',
            timezone: 'UTC'
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await usersRef.add(userData);
        console.log(`New user registered: ${telegramUser.first_name} (${telegramUser.id})`);
      } else {
        // Update existing user
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || '',
          username: telegramUser.username || '',
          languageCode: telegramUser.language_code || 'en',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`User updated: ${telegramUser.first_name} (${telegramUser.id})`);
      }
    } catch (error) {
      console.error('Error registering user:', error);
    }
  }

  async handleStartParam(chatId, user, startParam) {
    console.log(`Handling start param: ${startParam}`);

    // Check if it's a product-specific link
    if (startParam.includes('_product_')) {
      const [shopId, , productId] = startParam.split('_');
      await this.sendProductDetails(chatId, user, shopId, productId);
      return;
    }

    // Regular shop link
    const shop = await this.getShopById(startParam);
    
    if (shop) {
      await this.sendShopCatalog(chatId, user, shop);
    } else {
      // Try to find by slug
      const shopBySlug = await this.getShopBySlug(startParam);
      if (shopBySlug) {
        await this.sendShopCatalog(chatId, user, shopBySlug);
      } else {
        await this.sendWelcomeMessage(chatId, user);
        bot.sendMessage(chatId, '❌ Shop not found. Here are all available shops:');
        await this.sendShopsList(chatId);
      }
    }
  }

  async sendWelcomeMessage(chatId, user) {
    const welcomeText = `
🛍️ *Welcome to Multi-Shop!*

Hello ${user.first_name}! 👋

Discover amazing shops and products right here in Telegram. Browse multiple stores, add items to your cart, and place orders easily.

*What you can do:*
🏪 Browse shops by category
📱 Use our Mini App for the best experience
🛒 Add products to your cart
📦 Track your orders
🔔 Get order notifications

Ready to start shopping?
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🛍️ Open Shop Directory', web_app: { url: process.env.MINI_APP_URL } }],
        [{ text: '🏪 Browse Shops', callback_data: 'browse_shops' }],
        [{ text: '📦 My Orders', callback_data: 'my_orders' }]
      ]
    };

    await bot.sendMessage(chatId, welcomeText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async sendShopsList(chatId, messageId = null) {
    try {
      const shopsSnapshot = await db.collection('shops')
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .limit(10)
        .get();

      if (shopsSnapshot.empty) {
        const text = '🏪 No active shops found at the moment. Please check back later!';
        
        if (messageId) {
          await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
        } else {
          await bot.sendMessage(chatId, text);
        }
        return;
      }

      const shops = [];
      shopsSnapshot.forEach(doc => {
        const data = doc.data();
        shops.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          logo: data.logo,
          stats: data.stats || {}
        });
      });

      const text = `🛍️ *Available Shops* (${shops.length})\n\nChoose a shop to browse their products:`;
      
      const keyboard = {
        inline_keyboard: [
          ...shops.map(shop => [{
            text: `🏪 ${shop.name} (${shop.stats.totalProducts || 0} products)`,
            callback_data: `shop_${shop.id}`
          }]),
          [{ text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL } }]
        ]
      };

      if (messageId) {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('Error sending shops list:', error);
      bot.sendMessage(chatId, '❌ Failed to load shops. Please try again.');
    }
  }

  async sendShopCatalog(chatId, user, shop) {
    try {
      // Get shop categories and products
      const [categoriesSnapshot, productsSnapshot] = await Promise.all([
        db.collection('categories')
          .where('shopId', '==', shop.id)
          .where('isActive', '==', true)
          .orderBy('order', 'asc')
          .get(),
        db.collection('products')
          .where('shopId', '==', shop.id)
          .where('isActive', '==', true)
          .orderBy('featured', 'desc')
          .limit(20)
          .get()
      ]);

      const categories = [];
      categoriesSnapshot.forEach(doc => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data.name,
          icon: data.icon || '📦'
        });
      });

      const products = [];
      productsSnapshot.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          name: data.name,
          price: data.price,
          stock: data.stock || 0,
          category: data.category,
          featured: data.featured || false
        });
      });

      // Send shop header
      const shopText = `
🏪 *${shop.name}*

${shop.description}

📦 *${products.length} Products Available*
${categories.length > 0 ? `🏷️ *${categories.length} Categories*` : ''}

${shop.businessInfo?.address ? `📍 ${shop.businessInfo.address}` : ''}
${shop.businessInfo?.phone ? `📞 ${shop.businessInfo.phone}` : ''}
${shop.settings?.businessHours ? `🕒 ${shop.settings.businessHours.open} - ${shop.settings.businessHours.close}` : ''}
      `;

      // Create keyboard with categories and featured products
      const keyboard = {
        inline_keyboard: [
          [{ text: '📱 Open Shop Catalog', web_app: { url: `${process.env.MINI_APP_URL}?start=${shop.id}` } }],
          ...categories.slice(0, 3).map(category => [{
            text: `${category.icon} ${category.name}`,
            callback_data: `category_${shop.id}_${category.name}`
          }]),
          ...(categories.length > 3 ? [[{ text: '📋 View All Categories', callback_data: `categories_${shop.id}` }]] : []),
          [{ text: '🔙 Back to Shops', callback_data: 'back_to_shops' }]
        ]
      };

      await bot.sendMessage(chatId, shopText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      // Send featured products if any
      const featuredProducts = products.filter(p => p.featured).slice(0, 3);
      if (featuredProducts.length > 0) {
        const featuredText = `⭐ *Featured Products:*\n\n${featuredProducts.map(p => 
          `🛍️ *${p.name}* - $${p.price.toFixed(2)}\n${p.stock > 0 ? '✅ In Stock' : '❌ Out of Stock'}`
        ).join('\n\n')}`;

        const featuredKeyboard = {
          inline_keyboard: featuredProducts.map(product => [{
            text: `🛒 ${product.name} - $${product.price.toFixed(2)}`,
            callback_data: `product_${product.id}`
          }])
        };

        await bot.sendMessage(chatId, featuredText, {
          parse_mode: 'Markdown',
          reply_markup: featuredKeyboard
        });
      }
    } catch (error) {
      console.error('Error sending shop catalog:', error);
      bot.sendMessage(chatId, '❌ Failed to load shop catalog. Please try again.');
    }
  }

  async sendProductDetails(chatId, user, shopId, productId) {
    try {
      const [productDoc, shopDoc] = await Promise.all([
        db.collection('products').doc(productId).get(),
        db.collection('shops').doc(shopId).get()
      ]);

      if (!productDoc.exists || !shopDoc.exists) {
        bot.sendMessage(chatId, '❌ Product or shop not found.');
        return;
      }

      const product = { id: productDoc.id, ...productDoc.data() };
      const shop = { id: shopDoc.id, ...shopDoc.data() };

      const productText = `
🛍️ *${product.name}*

${product.description}

💰 *Price:* $${product.price.toFixed(2)}
📦 *Stock:* ${product.stock} available
🏷️ *Category:* ${product.category}
${product.sku ? `🔖 *SKU:* ${product.sku}` : ''}

🏪 *From:* ${shop.name}
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📱 View in Mini App', web_app: { url: `${process.env.MINI_APP_URL}?start=${shopId}_product_${productId}` } }],
          [{ text: '🏪 View Shop', callback_data: `shop_${shopId}` }],
          [{ text: '🔙 Back to Shops', callback_data: 'back_to_shops' }]
        ]
      };

      // Send product image if available
      if (product.images && product.images.length > 0) {
        await bot.sendPhoto(chatId, product.images[0], {
          caption: productText,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        await bot.sendMessage(chatId, productText, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('Error sending product details:', error);
      bot.sendMessage(chatId, '❌ Failed to load product details. Please try again.');
    }
  }

  async sendUserOrders(chatId, telegramId) {
    try {
      const ordersSnapshot = await db.collection('orders')
        .where('telegramId', '==', telegramId.toString())
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      if (ordersSnapshot.empty) {
        const text = `
📦 *Your Orders*

You haven't placed any orders yet.

🛍️ Start shopping to see your orders here!
        `;

        const keyboard = {
          inline_keyboard: [
            [{ text: '🛍️ Browse Shops', callback_data: 'browse_shops' }],
            [{ text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL } }]
          ]
        };

        await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        return;
      }

      const orders = [];
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          shopId: data.shopId,
          total: data.total,
          status: data.status,
          items: data.items || [],
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      const text = `📦 *Your Orders* (${orders.length})\n\nYour recent orders:`;
      
      const keyboard = {
        inline_keyboard: [
          ...orders.slice(0, 5).map(order => [{
            text: `📋 Order #${order.id.slice(-6)} - $${order.total.toFixed(2)} (${order.status})`,
            callback_data: `order_${order.id}`
          }]),
          [{ text: '📱 View All in Mini App', web_app: { url: process.env.MINI_APP_URL } }]
        ]
      };

      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error sending user orders:', error);
      bot.sendMessage(chatId, '❌ Failed to load your orders. Please try again.');
    }
  }

  async sendMiniAppButton(chatId) {
    const text = `
📱 *Open Mini App*

Get the full shopping experience with our Mini App! Browse all shops, manage your cart, and track orders.
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🚀 Open Mini App', web_app: { url: process.env.MINI_APP_URL } }]
      ]
    };

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async getShopById(shopId) {
    try {
      const shopDoc = await db.collection('shops').doc(shopId).get();
      if (shopDoc.exists) {
        return { id: shopDoc.id, ...shopDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting shop by ID:', error);
      return null;
    }
  }

  async getShopBySlug(slug) {
    try {
      const shopsSnapshot = await db.collection('shops')
        .where('slug', '==', slug)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!shopsSnapshot.empty) {
        const shopDoc = shopsSnapshot.docs[0];
        return { id: shopDoc.id, ...shopDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting shop by slug:', error);
      return null;
    }
  }

  async searchShops(query) {
    try {
      const shopsSnapshot = await db.collection('shops')
        .where('isActive', '==', true)
        .get();

      const shops = [];
      shopsSnapshot.forEach(doc => {
        const data = doc.data();
        const shop = { id: doc.id, ...data };
        
        // Simple text search
        if (shop.name.toLowerCase().includes(query) || 
            shop.description.toLowerCase().includes(query)) {
          shops.push(shop);
        }
      });

      return shops.slice(0, 10); // Limit results
    } catch (error) {
      console.error('Error searching shops:', error);
      return [];
    }
  }

  async isAdmin(telegramId) {
    try {
      const usersSnapshot = await db.collection('users')
        .where('telegramId', '==', telegramId)
        .where('role', 'in', ['admin', 'shop_owner'])
        .get();

      return !usersSnapshot.empty;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Order notification methods
  async sendOrderNotification(order, departments) {
    try {
      const orderText = `
🔔 *New Order Received!*

📋 *Order #${order.id.slice(-6)}*
👤 *Customer:* ${order.customerName}
💰 *Total:* $${order.total.toFixed(2)}
📦 *Items:* ${order.items.length}

*Order Details:*
${order.items.map(item => `• ${item.productName} x${item.quantity} - $${item.total.toFixed(2)}`).join('\n')}

${order.customerNotes ? `📝 *Notes:* ${order.customerNotes}` : ''}
${order.deliveryAddress ? `📍 *Delivery:* ${order.deliveryAddress}` : ''}

⏰ *Ordered:* ${new Date().toLocaleString()}
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Confirm Order', callback_data: `confirm_order_${order.id}` },
            { text: '❌ Cancel Order', callback_data: `cancel_order_${order.id}` }
          ],
          [{ text: '📱 View in Admin Panel', web_app: { url: `${process.env.MINI_APP_URL}?admin=orders` } }]
        ]
      };

      // Send to all active departments
      for (const department of departments) {
        if (department.isActive && department.telegramChatId) {
          try {
            await bot.sendMessage(department.telegramChatId, orderText, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } catch (error) {
            console.error(`Failed to send notification to department ${department.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending order notification:', error);
    }
  }

  async sendOrderStatusUpdate(order, newStatus) {
    try {
      const statusEmojis = {
        pending: '⏳',
        confirmed: '✅',
        processing: '🔄',
        shipped: '🚚',
        delivered: '📦',
        cancelled: '❌'
      };

      const statusText = `
${statusEmojis[newStatus]} *Order Status Updated*

📋 *Order #${order.id.slice(-6)}*
📊 *Status:* ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
💰 *Total:* $${order.total.toFixed(2)}

${newStatus === 'shipped' && order.trackingNumber ? `🔍 *Tracking:* ${order.trackingNumber}` : ''}
${newStatus === 'delivered' ? '🎉 Thank you for your order!' : ''}
${newStatus === 'cancelled' ? '😔 Your order has been cancelled. Contact the shop for more details.' : ''}

⏰ *Updated:* ${new Date().toLocaleString()}
      `;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📱 View Order Details', web_app: { url: `${process.env.MINI_APP_URL}?order=${order.id}` } }],
          [{ text: '🛍️ Shop Again', callback_data: `shop_${order.shopId}` }]
        ]
      };

      // Send to customer
      if (order.telegramId) {
        await bot.sendMessage(order.telegramId, statusText, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } catch (error) {
      console.error('Error sending order status update:', error);
    }
  }
}

// Initialize bot
const multiShopBot = new MultiShopBot();

// Webhook endpoint for order notifications
app.post('/webhook/order', async (req, res) => {
  try {
    const { order, departments } = req.body;
    await multiShopBot.sendOrderNotification(order, departments);
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Webhook endpoint for order status updates
app.post('/webhook/order-status', async (req, res) => {
  try {
    const { order, status } = req.body;
    await multiShopBot.sendOrderStatusUpdate(order, status);
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Bot webhook server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});

console.log('Multi-Shop Telegram Bot started successfully!');

module.exports = { multiShopBot, app };