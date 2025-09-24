# Multi-Shop Telegram Mini App

A modern Telegram Mini App for browsing multiple shops, built with React, TypeScript, and Firebase.

## 🚀 Features

- **Telegram Integration**: Native Telegram Mini App with theme support
- **Shop Browsing**: Browse shops by category with ratings and descriptions
- **User Profile**: Display Telegram user information
- **Firebase Backend**: Real-time data with Firestore
- **Responsive Design**: Optimized for mobile devices
- **Modern UI**: Clean interface with Telegram's design language

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase Firestore
- **Build Tool**: Vite
- **Deployment**: Vercel
- **Icons**: Lucide React

## 📱 Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd telegram-mini-app-shop
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Firestore Database
4. Set up Firestore rules (for development):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
5. The app will automatically create sample data, or you can manually create collections:
   - `shops` - for shop data
   - `products` - for product data
   - `orders` - for order data

#### Sample Shop Document Structure:
```json
{
  "name": "Pizza Palace",
  "description": "Delicious Italian pizzas and pasta",
  "imageUrl": "https://example.com/pizza-palace.jpg",
  "category": "food",
  "rating": 4.5,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 4. Adding Sample Data

To add sample shop data to your Firebase:

1. Uncomment the line in `src/App.tsx`:
   ```typescript
   // await addSampleData(db)  // Remove the // to enable
   ```
2. Refresh the app once to populate the database
3. Comment the line back to prevent duplicate data

Or manually add shops through the Firebase Console.

### 4. Local Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

#### Option B: GitHub Integration
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### 6. Telegram Bot Setup

1. Create a new bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set up the Mini App:
   ```
   /newapp
   @your_bot_username
   App Name
   Description
   Photo (optional)
   https://your-vercel-app.vercel.app
   ```

### 7. Configure Telegram Mini App

In your bot settings with @BotFather:
- Set the Mini App URL to your Vercel deployment URL
- Configure the app name and description
- Upload an app icon (optional)

## 🔧 Environment Variables for Vercel

In your Vercel dashboard, add these environment variables:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | your-project-id |
| `VITE_FIREBASE_STORAGE_BUCKET` | your-project.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

## 📖 Usage Instructions

### For Users:
1. Open your Telegram bot
2. Tap the "Open App" button or use the menu button
3. Browse shops by category
4. View your profile information
5. Navigate using the bottom navigation

### For Developers:
1. Add shops to Firestore with the required structure
2. Customize the UI in the components folder
3. Add new features by creating new components
4. Deploy changes by pushing to your connected GitHub repo

## 🎨 Customization

### Adding New Categories:
Edit `src/components/ShopList.tsx` and update the `categories` array.

### Changing Theme:
Modify `tailwind.config.js` to customize colors and styling.

### Adding New Pages:
1. Create new components in `src/components/`
2. Add navigation logic in `src/App.tsx`
3. Update the navigation component

## 🔍 Testing

### Local Testing:
- Test in browser at `localhost:3000`
- Use browser dev tools to simulate mobile

### Telegram Testing:
- Use Telegram's test environment
- Test with real users in a private group
- Check all Telegram-specific features

## 📚 API Reference

### Telegram WebApp API:
- `window.Telegram.WebApp.ready()` - Initialize the app
- `window.Telegram.WebApp.expand()` - Expand to full height
- `window.Telegram.WebApp.initDataUnsafe.user` - Get user data

### Firebase Firestore:
- Collections: `shops`, `products`, `orders`
- Real-time updates supported
- Offline support included

## 🚨 Troubleshooting

### Common Issues:

1. **App not loading in Telegram**:
   - Check if HTTPS is enabled on your domain
   - Verify the Mini App URL in @BotFather

2. **Firebase connection errors**:
   - Verify environment variables
   - Check Firebase project settings
   - Ensure Firestore is enabled

3. **Build failures on Vercel**:
   - Check all environment variables are set
   - Verify package.json scripts
   - Check build logs for specific errors

## 📄 License

MIT License - feel free to use this project for your own applications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the Telegram Mini App documentation
- Review Firebase documentation for backend issues