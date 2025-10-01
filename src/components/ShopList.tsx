import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop, Product, UserData, Order, OrderItem } from '../types'
import ProductDetails from './ProductDetails'
import { Store, Star, Package, ArrowLeft, ShoppingCart, Plus, Minus, CheckCircle, Share2, ExternalLink } from 'lucide-react'

// Simple IndexedDB wrapper for ShopList caching
class ShopListCache { 
  private dbName = 'ShopListCache'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create stores
        if (!db.objectStoreNames.contains('shops')) {
          db.createObjectStore('shops', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
      }
    })
  }

  async getShops(): Promise<Shop[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shops'], 'readonly')
      const store = transaction.objectStore('shops')
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async setShops(shops: Shop[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shops'], 'readwrite')
      const store = transaction.objectStore('shops')
      
      // Clear existing data
      store.clear()
      
      // Add new data
      shops.forEach(shop => store.add(shop))
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getProducts(shopId: string): Promise<Product[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readonly')
      const store = transaction.objectStore('products')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allProducts = request.result || []
        const shopProducts = allProducts.filter((p: Product) => p.shopId === shopId)
        resolve(shopProducts)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setProducts(shopId: string, products: Product[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite')
      const store = transaction.objectStore('products')
      
      // Remove existing products for this shop
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => {
        const allProducts = getAllRequest.result || []
        const otherShopProducts = allProducts.filter((p: Product) => p.shopId !== shopId)
        
        // Clear and re-add
        store.clear()
        otherShopProducts.forEach(product => store.add(product))
        products.forEach(product => store.add(product))
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }

  async getCategories(shopId: string): Promise<string[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readonly')
      const store = transaction.objectStore('categories')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allCategories = request.result || []
        const shopCategories = allCategories
          .filter((c: any) => c.shopId === shopId)
          .map((c: any) => c.name)
        resolve(shopCategories)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setCategories(shopId: string, categories: string[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite')
      const store = transaction.objectStore('categories')
      
      // Remove existing categories for this shop
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => {
        const allCategories = getAllRequest.result || []
        const otherShopCategories = allCategories.filter((c: any) => c.shopId !== shopId)
        
        // Clear and re-add
        store.clear()
        otherShopCategories.forEach(category => store.add(category))
        categories.forEach((name, index) => {
          store.add({
            id: `${shopId}_${name}`,
            shopId,
            name,
            order: index
          })
        })
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }
}

const shopListCache = new ShopListCache()

const ShopList: React.FC = () => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'shops' | 'categories' | 'products' | 'cart'>('shops')
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    // Initialize cache
    shopListCache.init().catch(console.error)
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    if (user?.id) {
      fetchUserData()
    } else {
      setLoading(false)
      setError('Please open this app from Telegram to see your shops.')
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        setError('No user information available')
        return
      }

      // Query users collection by telegramId
      const usersRef = collection(db, 'users')
      
      // Try both telegramId and telegram_id fields
      let userSnapshot = await getDocs(query(usersRef, where('telegramId', '==', parseInt(user.id))))
      
      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegram_id', '==', parseInt(user.id))))
      }
      
      if (userSnapshot.empty) {
        // For demo purposes, show all active shops if user not found
        console.log('User not found in database, showing all active shops')
        await fetchAllActiveShops()
        setLoading(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      setUserData(userData)

      // Fetch all active shops for browsing
      await fetchAllActiveShops()
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load your shop data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllActiveShops = async () => {
    try {
      // Try to load from cache first
      if (!isOnline) {
        console.log('Offline: Loading shops from cache')
        const cachedShops = await shopListCache.getShops()
        if (cachedShops.length > 0) {
          setShops(cachedShops)
          return
        }
      }
      
      const shopsRef = collection(db, 'shops')
      const shopsQuery = query(
        shopsRef, 
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      )
      const shopsSnapshot = await getDocs(shopsQuery)
      
      if (shopsSnapshot.empty) {
        // Try cache as fallback
        const cachedShops = await shopListCache.getShops()
        if (cachedShops.length > 0) {
          setShops(cachedShops)
          return
        }
        setError('No active shops found.')
        return
      }
      
      const allShops: Shop[] = []
      shopsSnapshot.forEach((doc) => {
        const data = doc.data()
        const shop: Shop = {
          id: doc.id,
          ownerId: data.ownerId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          logo: data.logo,
          isActive: data.isActive,
          businessInfo: data.businessInfo,
          settings: data.settings,
          stats: data.stats,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        allShops.push(shop)
      })
      
      setShops(allShops)
      
      // Cache the shops for offline use
      try {
        await shopListCache.setShops(allShops)
        console.log('Shops cached successfully')
      } catch (cacheError) {
        console.warn('Failed to cache shops:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching all active shops:', error)
      
      // Try to load from cache as fallback
      try {
        const cachedShops = await shopListCache.getShops()
        if (cachedShops.length > 0) {
          setShops(cachedShops)
          setError('Showing cached shops (offline)')
        } else {
          setError('Failed to load shops. Please try again.')
        }
      } catch (cacheError) {
        setError('Failed to load shops. Please try again.')
      }
    }
  }

  const shareShop = (shop: Shop) => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const shareUrl = `https://t.me/${botUsername}?start=${shop.id}`
    const shareText = `Check out ${shop.name}! 🛍️\n\n${shop.description}\n\n${shareUrl}`
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`)
    } else if (navigator.share) {
      navigator.share({
        title: shop.name,
        text: shareText,
        url: shareUrl
      }).catch(console.error)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Shop link copied to clipboard!')
        } else {
          alert('Shop link copied to clipboard!')
        }
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = shareText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Shop link copied to clipboard!')
        } else {
          alert('Shop link copied to clipboard!')
        }
      })
    }
  }

  const fetchShopCategories = async (shopId: string) => {
    try {
      setLoading(true)
      
      // Try to load from cache first
      if (!isOnline) {
        console.log('Offline: Loading categories from cache')
        const cachedCategories = await shopListCache.getCategories(shopId)
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories)
          setLoading(false)
          return
        }
      }
      
      const categoriesRef = collection(db, 'categories')
      const categoriesQuery = query(
        categoriesRef, 
        where('shopId', '==', shopId),
        
        orderBy('order', 'asc')
      )
      const categoriesSnapshot = await getDocs(categoriesQuery)
      
      const categoriesList: string[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.name) {
          categoriesList.push(data.name)
        }
      })

      setCategories(categoriesList)
      
      // Cache the categories
      try {
        await shopListCache.setCategories(shopId, categoriesList)
        console.log('Categories cached successfully')
      } catch (cacheError) {
        console.warn('Failed to cache categories:', cacheError)
      }
      
      if (categoriesList.length === 0) {
        // Try cache as fallback
        const cachedCategories = await shopListCache.getCategories(shopId)
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories)
        } else {
          setError('No categories found for this shop.')
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      
      // Try to load from cache as fallback
      try {
        const cachedCategories = await shopListCache.getCategories(shopId)
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories)
          setError('Showing cached categories (offline)')
        } else {
          setError('Failed to load categories. Please try again.')
        }
      } catch (cacheError) {
        setError('Failed to load categories. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryProducts = async (shopId: string, category: string) => {
    try {
      setLoading(true)
      
      // Try to load from cache first
      if (!isOnline) {
        console.log('Offline: Loading products from cache')
        const cachedProducts = await shopListCache.getProducts(shopId)
        const categoryProducts = cachedProducts.filter(p => p.category === category && p.isActive)
        if (categoryProducts.length > 0) {
          setProducts(categoryProducts)
          setLoading(false)
          return
        }
      }
      
      const productsRef = collection(db, 'products')
      const productsQuery = query(
        productsRef, 
        where('shopId', '==', shopId),
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      )
      const productsSnapshot = await getDocs(productsQuery)
      
      const productsList: Product[] = []
      productsSnapshot.forEach((doc) => {
        const data = doc.data()
        const product: Product = {
          id: doc.id,
          shopId: data.shopId,
          name: data.name || 'Unnamed Product',
          description: data.description || 'No description available',
          price: data.price || 0,
          stock: data.stock || 0,
          category: data.category || 'other',
          subcategory: data.subcategory,
          images: data.images || [],
          sku: data.sku,
          isActive: data.isActive !== false,
          lowStockAlert: data.lowStockAlert || 0,
          tags: data.tags,
          featured: data.featured,
          costPrice: data.costPrice,
          weight: data.weight,
          dimensions: data.dimensions,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        productsList.push(product)
      })

      setProducts(productsList)
      
      // Cache the products
      try {
        await shopListCache.setProducts(shopId, productsList)
        console.log('Products cached successfully')
      } catch (cacheError) {
        console.warn('Failed to cache products:', cacheError)
      }
      
      if (productsList.length === 0) {
        // Try cache as fallback
        const cachedProducts = await shopListCache.getProducts(shopId)
        const categoryProducts = cachedProducts.filter(p => p.category === category && p.isActive)
        if (categoryProducts.length > 0) {
          setProducts(categoryProducts)
        } else {
          setError(`No products found in the ${category} category.`)
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      
      // Try to load from cache as fallback
      try {
        const cachedProducts = await shopListCache.getProducts(shopId)
        const categoryProducts = cachedProducts.filter(p => p.category === category && p.isActive)
        if (categoryProducts.length > 0) {
          setProducts(categoryProducts)
          setError('Showing cached products (offline)')
        } else {
          setError('Failed to load products. Please try again.')
        }
      } catch (cacheError) {
        setError('Failed to load products. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedProducts = async (shopId: string) => {
    try {
      setLoading(true)
      
      // Try to load from cache first
      if (!isOnline) {
        console.log('Offline: Loading featured products from cache')
        const cachedProducts = await shopListCache.getProducts(shopId)
        const featuredProducts = cachedProducts.filter(p => p.featured && p.isActive)
        if (featuredProducts.length > 0) {
          setProducts(featuredProducts)
          setLoading(false)
          return
        }
      }
      
      const productsRef = collection(db, 'products')
      const productsQuery = query(
        productsRef, 
        where('shopId', '==', shopId),
        where('isActive', '==', true),
        where('featured', '==', true),
        orderBy('updatedAt', 'desc')
      )
      const productsSnapshot = await getDocs(productsQuery)
      
      const productsList: Product[] = []
      productsSnapshot.forEach((doc) => {
        const data = doc.data()
        const product = createProductFromData(doc.id, data)
        productsList.push(product)
      })

      setProducts(productsList)
      
      // Cache the products
      try {
        await shopListCache.setProducts(shopId, productsList)
        console.log('Featured products cached successfully')
      } catch (cacheError) {
        console.warn('Failed to cache featured products:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching featured products:', error)
      
      // Try to load from cache as fallback
      try {
        const cachedProducts = await shopListCache.getProducts(shopId)
        const featuredProducts = cachedProducts.filter(p => p.featured && p.isActive)
        if (featuredProducts.length > 0) {
          setProducts(featuredProducts)
          setError('Showing cached featured products (offline)')
        } else {
          setError('Failed to load featured products. Please try again.')
        }
      } catch (cacheError) {
        setError('Failed to load featured products. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const createProductFromData = (id: string, data: any): Product => {
    return {
      id,
      shopId: data.shopId,
      name: data.name || 'Unnamed Product',
      description: data.description || 'No description available',
      price: data.price || 0,
      stock: data.stock || 0,
      category: data.category || 'other',
      subcategory: data.subcategory,
      images: data.images || [],
      sku: data.sku,
      isActive: data.isActive !== false,
      lowStockAlert: data.lowStockAlert || 0,
      tags: data.tags,
      featured: data.featured,
      costPrice: data.costPrice,
      weight: data.weight,
      dimensions: data.dimensions,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
  }

  const handleShopClick = (shop: Shop) => {
    // Navigate to shop catalog directly
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const shopUrl = `https://t.me/${botUsername}?start=${shop.id}`
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shopUrl)
    } else {
      // For testing outside Telegram, we can simulate the shop selection
      window.location.href = `${window.location.origin}?shop=${shop.id}`
    }
  }

  const handleShopClickFeatured = (shop: Shop) => {
    // Same as regular shop click - navigate to shop catalog
    handleShopClick(shop)
  }

  const handleCategoryClick = (category: string) => {
    if (selectedShop) {
      setSelectedCategory(category)
      setCurrentView('products')
      setError(null)
      fetchCategoryProducts(selectedShop.id, category)
    }
  }

  const handleBackToShops = () => {
    setCurrentView('shops')
    setSelectedShop(null)
    setCategories([])
    setError(null)
  }

  const handleBackToCategories = () => {
    setCurrentView('categories')
    setSelectedCategory('')
    setProducts([])
    setError(null)
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ))
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        productImage: product.images?.[0],
        productSku: product.sku
      }
      setCart([...cart, newItem])
    }
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId))
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity, total: quantity * item.price }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  const placeOrder = async () => {
    if (!selectedShop || !user || cart.length === 0) {
      console.warn("Cannot place order. Missing data:", { selectedShop, user, cart })
      setError("Cannot place order: missing information or empty cart.")
      return
    }
    
    try {
      setOrderPlacing(true)
      setError(null)
      
      const subtotal = getCartTotal()
      const tax = subtotal * 0.1 // 10% tax rate
      const total = subtotal + tax
      
      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        shopId: selectedShop.id,
        customerId: user.id,
        customerName: `${user.firstName} ${user.lastName || ''}`.trim(),
        items: cart,
        subtotal,
        tax,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        deliveryMethod: 'pickup',
        source: 'web',
        telegramId: user.id.toString(),
        telegramUsername: user.username
      }
      
      const ordersRef = collection(db, 'orders')
      await addDoc(ordersRef, {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Clear cart and show success
      setCart([])
      setShowOrderSuccess(true)
      
      console.log('Order placed successfully:', orderData)
      setTimeout(() => setShowOrderSuccess(false), 3000)
    } catch (error) {
      console.error('Error placing order:', error)
      setError('Failed to place order. Please try again.')
    } finally {
      setOrderPlacing(false)
    }
  }

  const handleViewCart = () => {
    setCurrentView('cart')
    setError(null)
  }

  const handleBackToProducts = () => {
    setCurrentView('products')
    setError(null)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleCloseProductDetails = () => {
    setSelectedProduct(null)
  }

  const handleAddToCartFromDetails = (product: Product, quantity: number) => {
    const existingItem = cart.find(item => item.productId === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: quantity, total: quantity * item.price }
          : item
      ))
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        price: product.price,
        total: product.price * quantity,
        productImage: product.images?.[0],
        productSku: product.sku
      }
      setCart([...cart, newItem])
    }
    setSelectedProduct(null)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">
            {error.includes('No shops') ? 'No Shops Found' : 'Error Loading Data'}
          </h3>
          <p className="text-telegram-hint mb-4">{error}</p>
          {!isOnline && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm">You're currently offline. Some data may be cached.</p>
            </div>
          )}
          {!error.includes('No shops') && (
            <button
              onClick={fetchUserData}
              className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render shops view
  if (currentView === 'shops') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Available Shops</h2>
            <p className="text-sm text-telegram-hint">
              {shops.length} shop{shops.length !== 1 ? 's' : ''} available
              {!isOnline && ' (cached)'}
            </p>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm">You're offline. Showing cached data.</p>
          </div>
        )}

        <div className="space-y-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => handleShopClick(shop)}
              className="bg-telegram-secondary-bg rounded-lg p-4 cursor-pointer transition-all hover:shadow-md active:scale-95"
            >
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {shop.logo ? (
                    <img 
                      src={shop.logo} 
                      alt={shop.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : null}
                  {!shop.logo && <Store className="w-8 h-8 text-telegram-hint" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-telegram-text truncate pr-2">
                      {shop.name}
                    </h3>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-telegram-text">
                        {(4.0 + Math.random()).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-telegram-hint mt-1 line-clamp-2">
                    {shop.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-telegram-button text-telegram-button-text px-2 py-1 rounded-full">
                        {shop.stats?.totalProducts || 0} Products
                      </span>
                      {shop.stats && shop.stats.totalProducts > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShopClickFeatured(shop)
                          }}
                          className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full"
                        >
                          Featured
                        </button>
                      )}
                    </div>
                    
                    <span className="text-xs text-telegram-hint">
                      {shop.isActive ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render categories view
  if (currentView === 'categories') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={handleBackToShops}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowLeft className="w-5 h-5 text-telegram-text" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">
              {selectedShop?.name}
            </h2>
            <p className="text-sm text-telegram-hint">Select a category</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className="bg-telegram-secondary-bg rounded-lg p-4 text-left hover:shadow-md transition-all active:scale-95"
            >
              <div className="text-center">
                <Package className="w-8 h-8 mx-auto text-telegram-button mb-2" />
                <h3 className="font-medium text-telegram-text capitalize">
                  {category}
                </h3>
                <p className="text-xs text-telegram-hint mt-1">
                  Browse {category.toLowerCase()}
                </p>
              </div>
            </button>
          ))}
        </div>
        
        {categories.length === 0 && !loading && (
          <div className="text-center py-8">
            <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
            <h3 className="text-lg font-medium text-telegram-text mb-2">No Categories</h3>
            <p className="text-telegram-hint">This shop hasn't set up categories yet.</p>
          </div>
        )}
      </div>
    )
  }

  // Render cart view
  if (currentView === 'cart') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={handleBackToProducts}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowLeft className="w-5 h-5 text-telegram-text" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Shopping Cart</h2>
            <p className="text-sm text-telegram-hint">
              {cart.length} item{cart.length !== 1 ? 's' : ''} • ${getCartTotal().toFixed(2)}
            </p>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm">You're offline. Showing cached categories.</p>
          </div>
        )}

        {showOrderSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span>Order placed successfully!</span>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
            <h3 className="text-lg font-medium text-telegram-text mb-2">Your cart is empty</h3>
            <p className="text-telegram-hint">Add some products to get started!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="bg-telegram-secondary-bg rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-telegram-text">{item.productName}</h3>
                      <p className="text-sm text-telegram-hint">${item.price.toFixed(2)} each</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-telegram-button text-telegram-button-text flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-telegram-text font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-telegram-button text-telegram-button-text flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-telegram-text">${item.total.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="bg-telegram-secondary-bg rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-telegram-text">
                <span>Subtotal:</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-telegram-text">
                <span>Tax (10%):</span>
                <span>${(getCartTotal() * 0.1).toFixed(2)}</span>
              </div>
              <hr className="border-telegram-hint/20" />
              <div className="flex justify-between font-bold text-lg text-telegram-text">
                <span>Total:</span>
                <span>${(getCartTotal() * 1.1).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Place Order Button */}
            <button
              onClick={placeOrder}
              disabled={orderPlacing}
              className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {orderPlacing ? 'Placing Order...' : 'Place Order'}
            </button>
          </>
        )}
      </div>
    )
  }

  // Render products view
  if (currentView === 'products') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToCategories}
              className="p-2 rounded-lg bg-telegram-secondary-bg"
            >
              <ArrowLeft className="w-5 h-5 text-telegram-text" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-telegram-text capitalize">
                {selectedCategory}
              </h2>
              <p className="text-sm text-telegram-hint">
                {selectedShop?.name} • {products.length} product{products.length !== 1 ? 's' : ''}
                {!isOnline && ' (cached)'}
              </p>
            </div>
          </div>
          
          {cart.length > 0 && (
            <button
              onClick={handleViewCart}
              className="relative p-2 rounded-lg bg-telegram-button text-telegram-button-text"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getCartItemCount()}
              </span>
            </button>
          )}
        </div>

        {!isOnline && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm">You're offline. Showing cached products.</p>
          </div>
        )}

        <div className="space-y-3">
          {products.map((product) => {
            const cartItem = cart.find(item => item.productId === product.id)
            return (
              <div
                key={product.id}
                className="bg-telegram-secondary-bg rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div 
                    className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    {product.images?.[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : null}
                    {!product.images?.[0] && <Package className="w-8 h-8 text-telegram-hint" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 
                        className="font-semibold text-telegram-text truncate pr-2 cursor-pointer hover:text-telegram-button"
                        onClick={() => handleProductClick(product)}
                      >
                        {product.name}
                      </h3>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-telegram-button">
                          ${product.price.toFixed(2)}
                        </div>
                        {product.stock === 0 && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p 
                      className="text-sm text-telegram-hint mt-1 line-clamp-2 cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      {product.description}
                    </p>
                    
                    {/* Add to Cart Controls */}
                    <div className="flex items-center justify-between mt-3">
                      {product.stock > 0 ? (
                        cartItem ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateCartQuantity(product.id, cartItem.quantity - 1)}
                              className="w-8 h-8 rounded-full bg-telegram-button text-telegram-button-text flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-telegram-text font-medium">{cartItem.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                              className="w-8 h-8 rounded-full bg-telegram-button text-telegram-button-text flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-telegram-hint ml-2">
                              ${(cartItem.quantity * product.price).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="flex items-center space-x-2 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add to Cart</span>
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-red-500">Out of Stock</span>
                      )}
                      
                      <button
                        onClick={() => handleProductClick(product)}
                        className="text-sm text-telegram-button hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Product Details Modal */}
        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onClose={handleCloseProductDetails}
            onAddToCart={handleAddToCartFromDetails}
            cartItem={cart.find(item => item.productId === selectedProduct.id)}
            onUpdateCartQuantity={updateCartQuantity}
          />
        )}
      </div>
    )
  }

  return null
}

export default ShopList