import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop } from '../types'
import { Store, Star, MapPin, Clock, Phone, Package } from 'lucide-react'

const ShopList: React.FC = () => {
  const { db } = useFirebase()
  const { webApp } = useTelegram()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Categories will be dynamically loaded from actual data
  const [categories, setCategories] = useState<string[]>(['all'])

  useEffect(() => {
    fetchShops()
  }, [selectedCategory])

  const fetchShops = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const shopsRef = collection(db, 'shops')
      let q = query(shopsRef, orderBy('name'))
      
      if (selectedCategory !== 'all') {
        q = query(shopsRef, where('category', '==', selectedCategory), orderBy('name'))
      }

      const querySnapshot = await getDocs(q)
      const shopsData: Shop[] = []
      const categoriesSet = new Set<string>(['all'])
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const shop: Shop = {
          id: doc.id,
          name: data.name || 'Unnamed Shop',
          description: data.description || 'No description available',
          imageUrl: data.imageUrl || data.image_url || '',
          category: data.category || 'other',
          rating: data.rating || 0,
          isActive: data.isActive !== false, // Default to true if not specified
          address: data.address || '',
          phone: data.phone || '',
          hours: data.hours || data.opening_hours || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        
        shopsData.push(shop)
        categoriesSet.add(shop.category)
      })

      setShops(shopsData)
      setCategories(Array.from(categoriesSet).sort())
      
      if (shopsData.length === 0) {
        setError('No shops found in the database')
      }
    } catch (error) {
      console.error('Error fetching shops:', error)
      setError('Failed to load shops. Please check your connection.')
      
      // Show error using Telegram's popup if available
      if (webApp?.showAlert) {
        webApp.showAlert('Failed to load shops. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleShopClick = (shop: Shop) => {
    // Show shop details in Telegram popup
    if (webApp?.showAlert) {
      const details = [
        `📍 ${shop.address || 'Address not available'}`,
        `📞 ${shop.phone || 'Phone not available'}`,
        `🕒 ${shop.hours || 'Hours not available'}`,
        `⭐ Rating: ${shop.rating}/5`
      ].join('\n')
      
      webApp.showAlert(`${shop.name}\n\n${shop.description}\n\n${details}`)
    }
  }

  const handleRefresh = () => {
    fetchShops()
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
          <Package className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">Error Loading Shops</h3>
          <p className="text-telegram-hint mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex overflow-x-auto space-x-2 pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-telegram-button text-telegram-button-text'
                  : 'bg-telegram-secondary-bg text-telegram-text'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Shops List */}
      {shops.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">No shops found</h3>
          <p className="text-telegram-hint">
            {selectedCategory === 'all' 
              ? 'No shops available in the database.'
              : `No shops found in the ${selectedCategory} category.`
            }
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-telegram-hint">
              {shops.length} shop{shops.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={handleRefresh}
              className="text-sm text-telegram-button"
            >
              Refresh
            </button>
          </div>
          
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
                  
                  {/* Shop details */}
                  <div className="mt-2 space-y-1">
                    {shop.address && (
                      <div className="flex items-center space-x-1 text-xs text-telegram-hint">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                    )}
                    {shop.hours && (
                      <div className="flex items-center space-x-1 text-xs text-telegram-hint">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{shop.hours}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="flex items-center space-x-1 text-xs text-telegram-hint">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{shop.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-telegram-button text-telegram-button-text px-2 py-1 rounded-full">
                      {shop.category}
                    </span>
                    
                    {!shop.isActive && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ShopList