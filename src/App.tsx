import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { useWebApp, useInitData } from '@telegram-apps/sdk/react'
import { FirebaseProvider } from './contexts/FirebaseContext'
import ShopList from './components/ShopList'
import UserProfile from './components/UserProfile'
import Navigation from './components/Navigation'
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
  const webApp = useWebApp()
  const initData = useInitData()

  useEffect(() => {
    // Configure Telegram WebApp
    if (webApp) {
      webApp.ready()
      webApp.expand()
      webApp.setHeaderColor('#2481cc')
    }
    
    // Get user data from Telegram
    if (initData?.user) {
      setUser({
        id: initData.user.id.toString(),
        firstName: initData.user.firstName,
        lastName: initData.user.lastName || '',
        username: initData.user.username || '',
        languageCode: initData.user.languageCode || 'en'
      })
    }
  }, [webApp, initData])

  return (
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
  )
}

export default App