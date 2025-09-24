import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop } from '../types'
import { Store, Star, MapPin } from 'lucide-react'

const ShopList: React.FC = () => {
  const { db } = useFirebase()
  const { webApp } = useTelegram()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', 'food', 'electronics', 'clothing', 'books', 'other']

  useEffect(() => {
    fetchShops()
  }, [selectedCategory])

  const fetchShops = async () => {
    try {
      setLoading(true)
      const shopsRef = collection(db, 'shops')
      let q = query(shopsRef, where('isActive', '==', true))
      
      if (selectedCategory !== 'all') {
        q = query(shopsRef, where('isActive', '==', true), where('category', '==', selectedCategory))
      }

      const querySnapshot = await getDocs(q)
      const shopsData: Shop[] = []
      
      querySnapshot.forEach((doc) => {
        shopsData.push({
          id: doc.id,
          ...doc.data(),
          rating: doc.data().rating ?? 0,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        } as Shop)
      })

      setShops(shopsData)
    } catch (error) {
      console.error('Error fetching shops:', error)
      // Show error using Telegram's popup if available
      if (webApp?.showAlert) {
        webApp.showAlert('Failed to load shops. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleShopClick = (shop: Shop) => {
    // In a real app, this would navigate to shop details
    if (webApp?.showAlert) {
      webApp.showAlert(`Opening ${shop.name}...`)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Category Filter */}
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

      {/* Shops List */}
      {shops.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">No shops found</h3>
          <p className="text-telegram-hint">
            {selectedCategory === 'all' 
              ? 'No active shops available at the moment.'
              : `No shops found in the ${selectedCategory} category.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => handleShopClick(shop)}
              className="bg-telegram-secondary-bg rounded-lg p-4 cursor-pointer transition-all hover:shadow-md active:scale-95"
            >
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {shop.imageUrl ? (
                    <img 
                      src={shop.imageUrl} 
                      alt={shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-8 h-8 text-telegram-hint" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-telegram-text truncate">
                    {shop.name}
                  </h3>
                  <p className="text-sm text-telegram-hint mt-1 line-clamp-2">
                    {shop.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-telegram-text">
                        {shop.rating.toFixed(1)}
                      </span>
                    </div>
                    
                    <span className="text-xs bg-telegram-button text-telegram-button-text px-2 py-1 rounded-full">
                      {shop.category}
                    </span>
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