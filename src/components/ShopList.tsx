import React, { useEffect, useState } from 'react'
import { useTelegram } from '../contexts/TelegramContext'
import { useShops } from '../hooks/useCache'
import { Shop, Product, UserData, Order, OrderItem } from '../types'
import { Store, Star, Package, ArrowLeft, ShoppingCart, Plus, Minus, CheckCircle } from 'lucide-react'

const ShopList: React.FC = () => {
  const { user } = useTelegram()
  const { data: shops, loading: shopsLoading, error: shopsError } = useShops()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(shopsError)
  const [userData, setUserData] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'shops' | 'categories' | 'products' | 'cart'>('shops')
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setError('Please open this app from Telegram to see your shops.')
    }
  }, [user])

  const fetchShopCategories = async (shopId: string) => {
    try {
      setLoading(true)
      const { cacheSyncService } = await import('../services/cacheSync')
      const cachedCategories = await cacheSyncService.getCachedData<any>('categories')
      const shopCategories = Array.isArray(cachedCategories) 
        ? cachedCategories.filter(cat => cat.shopId === shopId && cat.isActive)
        : []
      
      setCategories(shopCategories)
      
      if (shopCategories.length === 0) {
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
      const { cacheSyncService } = await import('../services/cacheSync')
      const cachedProducts = await cacheSyncService.getCachedData<Product>('products')
      const categoryProducts = Array.isArray(cachedProducts)
        ? cachedProducts.filter(product => 
            product.shopId === shopId && 
            product.category === category && 
            product.isActive
          )
        : []
      
      setProducts(categoryProducts)
      
      if (categoryProducts.length === 0) {
        setError(`No products found in the ${category} category.`)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedProducts = async (shopId: string) => {
    try {
      setLoading(true)
      const { cacheSyncService } = await import('../services/cacheSync')
      const cachedProducts = await cacheSyncService.getCachedData<Product>('products')
      const featuredProducts = Array.isArray(cachedProducts)
        ? cachedProducts.filter(product => 
            product.shopId === shopId && 
            product.isActive && 
            product.featured
          )
        : []
      
      setProducts(featuredProducts)
    } catch (error) {
      console.error('Error fetching featured products:', error)
      setError('Failed to load featured products. Please try again.')
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
    setSelectedShop(shop)
    setCurrentView('categories')
    setError(null)
    fetchShopCategories(shop.id)
  }

  const handleShopClickFeatured = (shop: Shop) => {
    setSelectedShop(shop)
    setCurrentView('products')
    setSelectedCategory('Featured')
    setError(null)
    fetchFeaturedProducts(shop.id)
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
      const { cacheSyncService } = await import('../services/cacheSync')
      
      const subtotal = getCartTotal()
      const tax = subtotal * 0.1 // 10% tax rate
      const total = subtotal + tax
      
      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        shopId: selectedShop.id,
        customerId: user.id,
        customerName: `${user.firstName} ${user.lastName}`.trim(),
        items: cart,
        subtotal,
        tax,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        deliveryMethod: 'pickup',
        source: 'web',
        telegramId: user.id,
        telegramUsername: user.username
      }
      
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await cacheSyncService.setCachedData('orders', orderId, {
        id: orderId,
        ...orderData,
        createdAt: new Date(),
        updatedAt: new Date()
      }, true)
      
      // Clear cart and show success
      setCart([])
      setShowOrderSuccess(true)
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

  if (shopsLoading || loading) {
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

  if (error || shopsError) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">
            {(error || shopsError)?.includes('No shops') ? 'No Shops Found' : 'Error Loading Data'}
          </h3>
          <p className="text-telegram-hint mb-4">{error || shopsError}</p>
          {!(error || shopsError)?.includes('No shops') && (
            <button
              onClick={() => window.location.reload()}
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
    const activeShops = Array.isArray(shops) ? shops.filter(shop => shop.isActive) : []
    
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Available Shops</h2>
            <p className="text-sm text-telegram-hint">
              {activeShops.length} shop{activeShops.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {activeShops.map((shop) => (
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
              key={category.id}
              onClick={() => handleCategoryClick(category.name)}
              className="bg-telegram-secondary-bg rounded-lg p-4 text-left hover:shadow-md transition-all active:scale-95"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{category.icon}</div>
                <h3 className="font-medium text-telegram-text">
                  {category.name}
                </h3>
                <p className="text-xs text-telegram-hint mt-1">
                  {category.productCount || 0} products
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

        <div className="space-y-3">
          {products.map((product) => {
            const cartItem = cart.find(item => item.productId === product.id)
            return (
              <div
                key={product.id}
                className="bg-telegram-secondary-bg rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
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
                      <h3 className="font-semibold text-telegram-text truncate pr-2">
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
                    
                    <p className="text-sm text-telegram-hint mt-1 line-clamp-2">
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
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

export default ShopList