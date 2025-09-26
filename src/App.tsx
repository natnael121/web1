import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { TelegramProvider } from './contexts/TelegramContext'
import { FirebaseProvider } from './contexts/FirebaseContext'
import { cacheSyncService } from './services/cacheSync'
import ShopList from './components/ShopList'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import Navigation from './components/Navigation'
import SyncStatus from './components/common/SyncStatus'
import { User } from './types'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

function App() {
  const [currentView, setCurrentView] = useState<'shops' | 'profile' | 'admin'>('shops')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Initialize cache sync service
    const initializeCache = async () => {
      try {
        console.log('Initializing cache sync service...')
        await cacheSyncService.init(db, {
          syncInterval: 30000, // 30 seconds
          batchSize: 50,
          maxRetries: 3
        })
        console.log('Cache sync service initialized successfully')
      } catch (error) {
        console.error('Failed to initialize cache sync service:', error)
      }
    }
    
    initializeCache()

    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()
      
      // Set header color to match theme
      tg.setHeaderColor('#2481cc')
      
      // Get user data from Telegram
      const telegramUser = tg.initDataUnsafe?.user
      if (telegramUser) {
        setUser({
          id: telegramUser.id.toString(),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || '',
          username: telegramUser.username || '',
          languageCode: telegramUser.language_code || 'en',
          telegramId: telegramUser.id
        })
      }
    }
  }, [])

  return (
    <TelegramProvider>
      <FirebaseProvider db={db}>
        <div className="min-h-screen bg-telegram-bg text-telegram-text">
          <SyncStatus />
          <div className="max-w-md mx-auto">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-telegram-button text-telegram-button-text p-4 shadow-lg">
              <h1 className="text-xl font-bold text-center">Shop Directory</h1>
              {user && (
                <p className="text-sm text-center opacity-80 mt-1">
                  Welcome, {user.firstName}!
                </p>
              )}
            </header>

            {/* Main Content */}
            <main className="pb-20">
              {currentView === 'shops' && <ShopList />}
              {currentView === 'profile' && <UserProfile user={user} />}
              {currentView === 'admin' && <AdminPanel />}
            </main>

            {/* Bottom Navigation */}
            <Navigation 
              currentView={currentView} 
              onViewChange={setCurrentView} 
            />
          </div>
        </div>
      </FirebaseProvider>
    </TelegramProvider>
  )
}

export default App