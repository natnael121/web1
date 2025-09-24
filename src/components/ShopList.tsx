import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop, Product, UserData } from '../types'
import { Store, Star, MapPin, Clock, Phone, Package, ArrowLeft } from 'lucide-react'

const ShopList: React.FC = () => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [currentView, setCurrentView] = useState<'shops' | 'categories' | 'products'>('shops')
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
    } else {
      setLoading(false)
      setError('Please open this app from Telegram to see your shops.')
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

      // Query users collection by telegram_id
      const usersRef = collection(db, 'users')
      const userQuery = query(usersRef, where('telegram_id', '==', parseInt(user.id)))
      const userSnapshot = await getDocs(userQuery)
      
      if (userSnapshot.empty) {
        setError('No shops found. You haven\'t interacted with any shops yet.')
        setLoading(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      setUserData(userData)

      // Get shops that user has interacted with
      const shopIds = Object.keys(userData.shops || {})
      if (shopIds.length === 0) {
        setError('No shops found. You haven\'t interacted with any shops yet.')
        setLoading(false)
        return
      }

      await fetchUserShops(shopIds, userData.shops)
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load your shop data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserShops = async (shopIds: string[], shopsData: UserData['shops']) => {
    try {
      const shopsPromises = shopIds.map(async (shopId) => {
        const shopDoc = await getDoc(doc(db, 'shops', shopId))
        if (shopDoc.exists()) {
          const data = shopDoc.data()
          const shop: Shop = {
            id: shopDoc.id,
            name: data.name || 'Unnamed Shop',
            description: data.description || 'No description available',
            imageUrl: data.imageUrl || data.image_url || '',
            category: data.category || 'other',
            rating: data.rating || 0,
            isActive: data.isActive !== false,
            address: data.address || '',
            phone: data.phone || '',
            hours: data.hours || data.opening_hours || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastInteracted: shopsData[shopId]?.last_interacted?.toDate() || new Date()
          }
          return shop
        }
        return null
      })

      const shopsResults = await Promise.all(shopsPromises)
      const validShops = shopsResults.filter((shop): shop is Shop => shop !== null)
      
      // Sort by last interaction time (most recent first)
      validShops.sort((a, b) => {
        const aTime = a.lastInteracted?.getTime() || 0
        const bTime = b.lastInteracted?.getTime() || 0
        return bTime - aTime
      })

      setShops(validShops)
    } catch (error) {
      console.error('Error fetching shops:', error)
      setError('Failed to load shops. Please try again.')
    }
  }

  const fetchShopCategories = async (shopId: string) => {
    try {
      setLoading(true)
      const productsRef = collection(db, 'products')
      const productsQuery = query(productsRef, where('shopId', '==', shopId))
      const productsSnapshot = await getDocs(productsQuery)
      
      const categoriesSet = new Set<string>()
      productsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.category) {
          categoriesSet.add(data.category)
        }
      })

      const categoriesList = Array.from(categoriesSet).sort()
      setCategories(categoriesList)
      
      if (categoriesList.length === 0) {
        setError('No categories found for this shop.')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryProducts = async (shopId: string, category: string) => {
    try {
      setLoading(true)
      const productsRef = collection(db, 'products')
      const productsQuery = query(
        productsRef, 
        where('shopId', '==', shopId),
        where('category', '==', category),
        orderBy('name')
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
          imageUrl: data.imageUrl || data.image_url || '',
          category: data.category || 'other',
          inStock: data.inStock !== false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        productsList.push(product)
      })

      setProducts(productsList)
      
      if (productsList.length === 0) {
        setError(`No products found in the ${category} category.`)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleShopClick = (shop: Shop) => {
    setSelectedShop(shop)
    setCurrentView('categories')
    setError(null)
    fetchShopCategories(shop.id)
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

  const formatLastInteracted = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
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
            <h2 className="text-lg font-semibold text-telegram-text">Your Shops</h2>
            <p className="text-sm text-telegram-hint">
              {shops.length} shop{shops.length !== 1 ? 's' : ''} you've interacted with
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => handleShopClick(shop)}
              className="bg-telegram-secondary-bg rounded-lg p-4 cursor-pointer transition-all hover:shadow-md active:scale-95"
            >
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {shop.imageUrl ? (
                    <img 
                      src={shop.imageUrl} 
                      alt={shop.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <Store className={`w-8 h-8 text-telegram-hint ${shop.imageUrl ? 'hidden' : ''}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-telegram-text truncate pr-2">
                      {shop.name}
                    </h3>
                    {shop.rating > 0 && (
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium text-telegram-text">
                          {shop.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-telegram-hint mt-1 line-clamp-2">
                    {shop.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-telegram-button text-telegram-button-text px-2 py-1 rounded-full">
                      {shop.category}
                    </span>
                    
                    {shop.lastInteracted && (
                      <span className="text-xs text-telegram-hint">
                        Last visited: {formatLastInteracted(shop.lastInteracted)}
                      </span>
                    )}
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
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Render products view
  if (currentView === 'products') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-4">
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
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-telegram-secondary-bg rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <Package className={`w-8 h-8 text-telegram-hint ${product.imageUrl ? 'hidden' : ''}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-telegram-text truncate pr-2">
                      {product.name}
                    </h3>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-telegram-button">
                        ${product.price.toFixed(2)}
                      </div>
                      {!product.inStock && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-telegram-hint mt-1 line-clamp-2">
                    {product.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default ShopList