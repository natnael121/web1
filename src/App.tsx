import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore'
import { shopCustomerService } from './services/shopCustomerService'
import { TelegramProvider } from './contexts/TelegramContext'
import { FirebaseProvider } from './contexts/FirebaseContext'
import { cacheSyncService } from './services/cacheSync'
import ShopList from './components/ShopList'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import ShopCatalog from './components/ShopCatalog'
import Navigation from './components/Navigation'
import SyncStatus from './components/common/SyncStatus'
import { User, UserData, Shop } from './types'

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
const auth = getAuth(app)

function App() {
  const [currentView, setCurrentView] = useState<'shops' | 'profile' | 'admin' | 'catalog'>('shops')
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedShopForCatalog, setSelectedShopForCatalog] = useState<Shop | null>(null)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [deepLinkedProductId, setDeepLinkedProductId] = useState<string | null>(null)

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
      const startParameter = tg.initDataUnsafe?.start_param

      console.log('Telegram WebApp initDataUnsafe:', tg.initDataUnsafe)
      console.log('Telegram start parameter:', startParameter)

      if (startParameter) {
        setStartParam(startParameter)
      }

      if (telegramUser) {
        const userInfo = {
          id: telegramUser.id.toString(),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || '',
          username: telegramUser.username || '',
          languageCode: telegramUser.language_code || 'en',
          telegramId: telegramUser.id
        }
        setUser(userInfo)

        // Check if user exists in database
        checkUserInDatabase(telegramUser.id)
      } else {
        // For development/testing - check for start param even without user
        if (startParameter) {
          handleStartParam(startParameter)
        }
        setUserLoading(false)
      }
    } else {
      // For development/testing outside Telegram
      const urlParams = new URLSearchParams(window.location.search)
      const shopParam = urlParams.get('shop')
      if (shopParam) {
        setStartParam(shopParam)
        handleStartParam(shopParam)
      }
      setUserLoading(false)
    }
  }, [])

  const handleStartParam = async (param: string) => {
    try {
      console.log('Handling start parameter:', param)

      if (!user) {
        console.log('No user available for start param')
        return
      }

      const parts = param.split('_')
      const shopId = parts[0]
      const productId = parts[1] || null

      console.log('Parsed IDs:', { shopId, productId })

      // First, add user to shop_customers if not already there
      const result = await shopCustomerService.handleShopLinkAccess(
        db,
        param,
        user.telegramId || parseInt(user.id)
      )

      if (!result.success) {
        console.error('Failed to add user to shop:', result.error)
        return
      }

      if (productId) {
        setDeepLinkedProductId(productId)
      }

      let shopDoc = await getDoc(doc(db, 'shops', shopId))

      if (shopDoc.exists()) {
        const shopData = shopDoc.data()
        const shop: Shop = {
          id: shopDoc.id,
          ownerId: shopData.ownerId,
          name: shopData.name,
          slug: shopData.slug,
          description: shopData.description,
          logo: shopData.logo,
          isActive: shopData.isActive,
          businessInfo: shopData.businessInfo,
          settings: shopData.settings,
          stats: shopData.stats,
          createdAt: shopData.createdAt?.toDate() || new Date(),
          updatedAt: shopData.updatedAt?.toDate() || new Date()
        }

        console.log('Found shop:', shop)
        setSelectedShopForCatalog(shop)
        setCurrentView('catalog')
        return
      }

      // If not found by ID, try to find by slug
      const shopsRef = collection(db, 'shops')
      const slugQuery = query(shopsRef, where('slug', '==', param), where('isActive', '==', true))
      const slugSnapshot = await getDocs(slugQuery)

      if (!slugSnapshot.empty) {
        const shopDoc = slugSnapshot.docs[0]
        const shopData = shopDoc.data()
        const shop: Shop = {
          id: shopDoc.id,
          ownerId: shopData.ownerId,
          name: shopData.name,
          slug: shopData.slug,
          description: shopData.description,
          logo: shopData.logo,
          isActive: shopData.isActive,
          businessInfo: shopData.businessInfo,
          settings: shopData.settings,
          stats: shopData.stats,
          createdAt: shopData.createdAt?.toDate() || new Date(),
          updatedAt: shopData.updatedAt?.toDate() || new Date()
        }

        console.log('Found shop by slug:', shop)
        setSelectedShopForCatalog(shop)
        setCurrentView('catalog')
        return
      }

      console.log('Shop not found for parameter:', param)
    } catch (error) {
      console.error('Error handling start parameter:', error)
    }
  }

  const checkUserInDatabase = async (telegramId: number) => {
    try {
      setUserLoading(true)
      const usersRef = collection(db, 'users')

      // Try both telegramId and telegram_id fields
      let userSnapshot = await getDocs(query(usersRef, where('telegramId', '==', telegramId)))

      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegram_id', '==', telegramId)))
      }

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0]
        const userData = userDoc.data() as UserData
        setUserData({
          ...userData,
          uid: userDoc.id,
          createdAt: userData.createdAt?.toDate?.() || new Date(),
          updatedAt: userData.updatedAt?.toDate?.() || new Date()
        })

        // After user is set, handle start param if present
        if (startParam) {
          await handleStartParam(startParam)
        }
      } else {
        // User not found - if they have a shop link, auto-register them as customer
        if (startParam) {
          await autoRegisterCustomer(telegramId)
        } else {
          // No shop link, create basic user anyway
          await autoRegisterCustomer(telegramId)
        }
      }
    } catch (error) {
      console.error('Error checking user in database:', error)
    } finally {
      setUserLoading(false)
    }
  }

  const autoRegisterCustomer = async (telegramId: number) => {
    try {
      if (!user || !startParam) return

      // Create a minimal user record
      const newUserData: any = {
        displayName: `${user.firstName} ${user.lastName}`.trim() || 'Customer',
        telegramId: telegramId,
        telegram_id: telegramId,
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const usersRef = collection(db, 'users')
      const userDocRef = await addDoc(usersRef, newUserData)

      setUserData({
        ...newUserData,
        uid: userDocRef.id
      })

      // Process the shop link and load shop
      await handleStartParam(startParam)
    } catch (error) {
      console.error('Error auto-registering customer:', error)
      setShowRegistration(true)
    }
  }


  // Show loading while checking user
  if (userLoading) {
    return (
      <TelegramProvider>
        <FirebaseProvider db={db} auth={auth}>
          <div className="min-h-screen bg-telegram-bg text-telegram-text flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-telegram-button border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-telegram-hint">Loading...</p>
            </div>
          </div>
        </FirebaseProvider>
      </TelegramProvider>
    )
  }

  return (
    <TelegramProvider>
      <FirebaseProvider db={db} auth={auth}>
        <div className="min-h-screen bg-telegram-bg text-telegram-text">
          <SyncStatus />
          <div className={currentView === 'catalog' ? 'w-full max-w-7xl mx-auto' : 'max-w-md mx-auto'}>
            {/* Header */}
            {currentView !== 'catalog' && (
            <header className="sticky top-0 z-10 bg-telegram-button text-telegram-button-text p-4 shadow-lg">
              <h1 className="text-xl font-bold text-center">Shop Directory</h1>
              {user && (
                <p className="text-sm text-center opacity-80 mt-1">
                  Welcome, {user.firstName}!
                </p>
              )}
            </header>
            )}

            {/* Main Content */}
            <main className={currentView === 'catalog' ? 'pb-4' : 'pb-20'}>
              {currentView === 'catalog' && selectedShopForCatalog && (
                <ShopCatalog
                  shop={selectedShopForCatalog}
                  deepLinkedProductId={deepLinkedProductId}
                  onBack={() => {
                    setCurrentView('shops')
                    setSelectedShopForCatalog(null)
                    setDeepLinkedProductId(null)
                  }}
                />
              )}
              {currentView === 'shops' && <ShopList />}
              {currentView === 'profile' && <UserProfile user={user} userData={userData} />}
              {currentView === 'admin' && <AdminPanel />}
            </main>

            {/* Bottom Navigation - Show always when not in catalog view */}
            {currentView !== 'catalog' && (
              <Navigation 
                currentView={currentView} 
                onViewChange={(view) => {
                  if (view !== 'catalog') {
                    setSelectedShopForCatalog(null)
                  }
                  setCurrentView(view)
                }}
              />
            )}
          </div>
        </div>
      </FirebaseProvider>
    </TelegramProvider>
  )
}

export default App