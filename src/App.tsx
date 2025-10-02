import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { TelegramProvider } from './contexts/TelegramContext'
import { FirebaseProvider } from './contexts/FirebaseContext'
import { cacheSyncService } from './services/cacheSync'
import ShopList from './components/ShopList'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import UserRegistration from './components/UserRegistration'
import ShopCatalog from './components/ShopCatalog'
import Navigation from './components/Navigation'
import SyncStatus from './components/common/SyncStatus'
import { User, UserData, Shop, Customer } from './types'
import { Store, PlusCircle } from 'lucide-react'

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
  const [showRegistration, setShowRegistration] = useState(false)
  const [showNoShopsMessage, setShowNoShopsMessage] = useState(false)
  const [selectedShopForCatalog, setSelectedShopForCatalog] = useState<Shop | null>(null)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [deepLinkedProductId, setDeepLinkedProductId] = useState<string | null>(null)
  const [paramType, setParamType] = useState<'link' | 'start' | null>(null)

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
        const isLinkParam = startParameter.startsWith('link_')
        setParamType(isLinkParam ? 'link' : 'start')
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
      const linkParam = urlParams.get('link')
      if (linkParam) {
        setStartParam(linkParam)
        setParamType('link')
        handleStartParam(linkParam, 'link')
      } else if (shopParam) {
        setStartParam(shopParam)
        setParamType('start')
        handleStartParam(shopParam, 'start')
      }
      setUserLoading(false)
    }
  }, [])

  const handleStartParam = async (param: string, type: 'link' | 'start' = 'start') => {
    try {
      console.log('Handling parameter:', param, 'Type:', type)

      const actualParam = param.startsWith('link_') ? param.substring(5) : param

      const parts = actualParam.split('_')
      const shopId = parts[0]
      const productId = parts[1] || null

      console.log('Parsed IDs:', { shopId, productId })

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
      const customersRef = collection(db, 'customers')

      let userSnapshot = await getDocs(query(usersRef, where('telegramId', '==', telegramId)))

      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegram_id', '==', telegramId)))
      }

      let isAdmin = false
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0]
        const userData = userDoc.data() as UserData
        setUserData({
          ...userData,
          uid: userDoc.id,
          createdAt: userData.createdAt?.toDate?.() || new Date(),
          updatedAt: userData.updatedAt?.toDate?.() || new Date()
        })
        isAdmin = userData.role === 'admin' || userData.role === 'shop_owner'
      }

      let customerSnapshot = await getDocs(query(customersRef, where('telegramId', '==', telegramId)))

      if (startParam && paramType === 'link') {
        const actualParam = startParam.startsWith('link_') ? startParam.substring(5) : startParam
        const shopId = actualParam.split('_')[0]

        if (customerSnapshot.empty) {
          await createCustomerAndLinkShop(telegramId, shopId)
        } else {
          const customerDoc = customerSnapshot.docs[0]
          const customerData = customerDoc.data() as Customer

          if (!customerData.linkedShops.includes(shopId)) {
            await updateDoc(doc(db, 'customers', customerDoc.id), {
              linkedShops: arrayUnion(shopId),
              updatedAt: new Date()
            })
          }
        }

        await handleStartParam(startParam, 'link')
      } else if (startParam && paramType === 'start') {
        if (customerSnapshot.empty && !isAdmin) {
          setShowNoShopsMessage(true)
        } else {
          await handleStartParam(startParam, 'start')
        }
      } else if (isAdmin) {
        setCurrentView('shops')
      } else if (!customerSnapshot.empty) {
        setCurrentView('shops')
      } else {
        setShowNoShopsMessage(true)
      }
    } catch (error) {
      console.error('Error checking user in database:', error)
    } finally {
      setUserLoading(false)
    }
  }

  const createCustomerAndLinkShop = async (telegramId: number, shopId: string) => {
    try {
      const customersRef = collection(db, 'customers')
      const customerData: Omit<Customer, 'id'> = {
        telegramId,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        linkedShops: [shopId],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(doc(customersRef), customerData)
      console.log('Customer created and linked to shop:', shopId)
    } catch (error) {
      console.error('Error creating customer:', error)
    }
  }

  const handleRegistrationComplete = (newUserData: UserData) => {
    setUserData(newUserData)
    setShowRegistration(false)
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

  // Show no shops message
  if (showNoShopsMessage) {
    return (
      <TelegramProvider>
        <FirebaseProvider db={db} auth={auth}>
          <div className="min-h-screen bg-gradient-to-br from-telegram-button/10 via-telegram-bg to-telegram-secondary-bg flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8 text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-telegram-button rounded-2xl flex items-center justify-center">
                  <Store className="h-8 w-8 text-telegram-button-text" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-telegram-text">
                No Shops Found
              </h2>
              <p className="text-telegram-hint">
                You haven't interacted with any shops yet. Get a shop link from a shop owner to start shopping.
              </p>
              <div className="mt-6 p-4 bg-telegram-secondary-bg rounded-lg">
                <h3 className="text-lg font-semibold text-telegram-text mb-2">Want to create your own shop?</h3>
                <p className="text-sm text-telegram-hint mb-4">
                  Start selling your products by creating your own shop on our platform.
                </p>
                <button
                  onClick={() => window.open('https://t.me/YourBotUsername', '_blank')}
                  className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-lg font-semibold flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Create Your Own Shop</span>
                </button>
              </div>
            </div>
          </div>
        </FirebaseProvider>
      </TelegramProvider>
    )
  }

  // Show registration if user not in database
  if (showRegistration && user) {
    return (
      <TelegramProvider>
        <FirebaseProvider db={db} auth={auth}>
          <div className="min-h-screen bg-telegram-bg text-telegram-text">
            <SyncStatus />
            <UserRegistration
              user={user}
              onComplete={handleRegistrationComplete}
            />
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