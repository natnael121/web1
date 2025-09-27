import React, { useEffect, useState } from 'react'
import { db } from './config/firebase'
import { TelegramProvider } from './contexts/TelegramContext'
import { FirebaseProvider } from './contexts/FirebaseContext'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { cacheSyncService } from './services/cacheSync'
import ShopList from './components/ShopList'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import Navigation from './components/Navigation'
import SyncStatus from './components/common/SyncStatus'
import AuthForm from './components/AuthForm'
import { User } from './types'

function AppContent() {
  const { user: firebaseUser, userData, loading: authLoading } = useAuth()
  const [currentView, setCurrentView] = useState<'shops' | 'profile' | 'admin'>('shops')
  const [user, setUser] = useState<User | null>(null)

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-telegram-button border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-telegram-hint">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if user is not authenticated
  if (!firebaseUser) {
    return <AuthForm />
  }

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
      } else if (userData) {
        // Fallback to Firebase user data if no Telegram data
        setUser({
          id: userData.uid,
          firstName: userData.displayName?.split(' ')[0] || 'User',
          lastName: userData.displayName?.split(' ').slice(1).join(' ') || '',
          username: userData.email?.split('@')[0] || '',
          languageCode: userData.settings?.language || 'en',
          telegramId: userData.telegramId
        })
      }
    }
  }, [userData])

  return (
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
  )
}

function App() {
  return (
    <TelegramProvider>
      <FirebaseProvider db={db}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </FirebaseProvider>
    </TelegramProvider>
  )
}

export default App

        </div>
      </FirebaseProvider>
    </TelegramProvider>
  )
}

export default App