import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { TelegramProvider } from './contexts/TelegramContext'
import { FirebaseProvider } from './contexts/FirebaseContext'
import ShopList from './components/ShopList'
import UserProfile from './components/UserProfile'
import Navigation from './components/Navigation'
import { addSampleData } from './utils/sampleData'
import { Shop, User } from './types'

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
  const [currentView, setCurrentView] = useState<'shops' | 'profile'>('shops')
  const [user, setUser] = useState<User | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    // Check Firebase configuration and initialize
    const initializeFirebase = async () => {
      try {
        // Check if Firebase is properly configured
        if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
          console.warn('Firebase not configured. Please set up your .env file with Firebase credentials.')
          setFirebaseReady(false)
          return
        }
        
        // Optionally add sample data (uncomment the line below to add sample shops)
        // await addSampleData(db)
        
        setFirebaseReady(true)
        console.log('Firebase initialized successfully')
      } catch (error) {
        console.error('Firebase initialization error:', error)
        setFirebaseReady(false)
      }
    }
    
    initializeFirebase()
    
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
          languageCode: telegramUser.language_code || 'en'
        })
      }
    }
  }, [])

  // Show loading screen while Firebase is initializing
  if (!firebaseReady && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return (
      <div className="min-h-screen bg-telegram-bg text-telegram-text flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button mx-auto mb-4"></div>
          <p className="text-telegram-hint">Connecting to Firebase...</p>
        </div>
      </div>
    )
  }
  return (
    <TelegramProvider>
      <FirebaseProvider db={db}>
        <div className="min-h-screen bg-telegram-bg text-telegram-text">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-telegram-button text-telegram-button-text p-4 shadow-lg">
              <h1 className="text-xl font-bold text-center">Multi-Shop</h1>
              {user && (
                <p className="text-sm text-center opacity-80 mt-1">
                  Welcome, {user.firstName}!
                </p>
              )}
              {!import.meta.env.VITE_FIREBASE_PROJECT_ID && (
                <p className="text-xs text-center opacity-60 mt-1">
                  ⚠️ Firebase not configured
                </p>
              )}
            </header>

            {/* Main Content */}
            <main className="pb-20">
              {currentView === 'shops' && <ShopList />}
              {currentView === 'profile' && <UserProfile user={user} />}
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