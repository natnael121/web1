import React, { useEffect, useState } from 'react'
import { useOrders } from '../hooks/useCache'
import { cacheSyncService } from '../services/cacheSync'
import { User, Order, Shop } from '../types'
import { useTelegram } from '../contexts/TelegramContext'
import { 
  User as UserIcon, 
  Globe, 
  MessageCircle, 
  Settings, 
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  DollarSign,
  Calendar,
  ArrowRight,
  RefreshCw,
  Bell,
  Moon,
  Sun,
  Languages,
  Shield,
  Phone,
  Mail,
  MapPin,
  Store,
  Save,
  X
} from 'lucide-react'

interface UserProfileProps {
  user: User | null
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const { webApp } = useTelegram()
  const { data: orders, loading, error, refetch } = useOrders(user?.id)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [settings, setSettings] = useState({
    notifications: {
      orderUpdates: true,
      promotions: false,
      newsletter: false
    },
    theme: 'auto' as 'light' | 'dark' | 'auto',
    language: 'en',
    currency: 'USD'
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    completedOrders: 0
  })

  useEffect(() => {
    const loadShops = async () => {
      try {
        const cachedShops = await cacheSyncService.getCachedData<Shop>('shops')
        const activeShops = Array.isArray(cachedShops) 
          ? cachedShops.filter(shop => shop.isActive)
          : []
        setShops(activeShops)
      } catch (error) {
        console.error('Error fetching shops:', error)
      }
    }

    if (user?.id) {
      loadShops()
    }
  }, [user])

  // Calculate stats when orders change
  useEffect(() => {
    if (orders && Array.isArray(orders)) {
      const totalOrders = orders.length
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
      const pendingOrders = orders.filter(order => 
        ['pending', 'payment_pending', 'confirmed', 'processing'].includes(order.status)
      ).length
      const completedOrders = orders.filter(order => 
        order.status === 'delivered'
      ).length

      setStats({
        totalOrders,
        totalSpent,
        pendingOrders,
        completedOrders
      })
    }
  }, [orders])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'payment_pending':
        return 'bg-orange-100 text-orange-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-purple-100 text-purple-800'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'payment_pending':
        return <DollarSign className="w-4 h-4" />
      case 'confirmed':
      case 'processing':
        return <Package className="w-4 h-4" />
      case 'shipped':
        return <Truck className="w-4 h-4" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleSettingsClick = () => {
    setShowSettings(true)
  }

  const handleSupportClick = () => {
    setShowSupport(true)
  }

  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true)
      // In a real app, you would save settings to user profile in Firebase
      // For now, we'll just simulate saving to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings))
      
      if (webApp?.showAlert) {
        webApp.showAlert('Settings saved successfully!')
      }
      setShowSettings(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      if (webApp?.showAlert) {
        webApp.showAlert('Failed to save settings. Please try again.')
      }
    } finally {
      setSettingsLoading(false)
    }
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  const updateDirectSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Error loading saved settings:', error)
      }
    }
  }, [])

  if (!user) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">No user data</h3>
          <p className="text-telegram-hint">
            Please open this app from Telegram to see your profile.
          </p>
        </div>
      </div>
    )
  }

  // Settings Modal
  if (showSettings) {
    return (
      <div className="p-4 space-y-4">
        {/* Settings Header */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowRight className="w-5 h-5 text-telegram-text rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Settings</h2>
            <p className="text-sm text-telegram-hint">Customize your experience</p>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3 flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-telegram-text">Order Updates</p>
                <p className="text-xs text-telegram-hint">Get notified about order status changes</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.orderUpdates}
                onChange={(e) => updateSetting('notifications', 'orderUpdates', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-telegram-text">Promotions</p>
                <p className="text-xs text-telegram-hint">Receive special offers and discounts</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.promotions}
                onChange={(e) => updateSetting('notifications', 'promotions', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-telegram-text">Newsletter</p>
                <p className="text-xs text-telegram-hint">Weekly updates and news</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.newsletter}
                onChange={(e) => updateSetting('notifications', 'newsletter', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3 flex items-center">
            <Sun className="w-4 h-4 mr-2" />
            Appearance
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-telegram-text mb-2">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'auto', label: 'Auto', icon: Settings }
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => updateDirectSetting('theme', theme.value)}
                    className={`p-3 rounded-lg border text-center ${
                      settings.theme === theme.value
                        ? 'border-telegram-button bg-telegram-button bg-opacity-10'
                        : 'border-telegram-hint hover:border-telegram-button'
                    }`}
                  >
                    <theme.icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Language & Region */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3 flex items-center">
            <Languages className="w-4 h-4 mr-2" />
            Language & Region
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">Language</label>
              <select
                value={settings.language}
                onChange={(e) => updateDirectSetting('language', e.target.value)}
                className="w-full p-2 border rounded-lg bg-telegram-bg text-telegram-text"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => updateDirectSetting('currency', e.target.value)}
                className="w-full p-2 border rounded-lg bg-telegram-bg text-telegram-text"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="ETB">ETB (Br)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Privacy & Security
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left p-2 hover:bg-telegram-bg rounded-lg">
              <p className="text-sm font-medium text-telegram-text">Clear Order History</p>
              <p className="text-xs text-telegram-hint">Remove all your order data</p>
            </button>
            <button className="w-full text-left p-2 hover:bg-telegram-bg rounded-lg">
              <p className="text-sm font-medium text-telegram-text">Export Data</p>
              <p className="text-xs text-telegram-hint">Download your personal data</p>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={settingsLoading}
          className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {settingsLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{settingsLoading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    )
  }

  // Support Modal
  if (showSupport) {
    return (
      <div className="p-4 space-y-4">
        {/* Support Header */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setShowSupport(false)}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowRight className="w-5 h-5 text-telegram-text rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Support</h2>
            <p className="text-sm text-telegram-hint">Get help and contact information</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3 flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-telegram-hint" />
              <div>
                <p className="text-sm font-medium text-telegram-text">Email Support</p>
                <p className="text-sm text-telegram-button">support@multishop.app</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-4 h-4 text-telegram-hint" />
              <div>
                <p className="text-sm font-medium text-telegram-text">Telegram Support</p>
                <p className="text-sm text-telegram-button">@multishop_support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Contact Information */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3 flex items-center">
            <Store className="w-4 h-4 mr-2" />
            Shop Contacts
          </h3>
          {shops.length > 0 ? (
            <div className="space-y-3">
              {shops.map((shop) => (
                <div key={shop.id} className="border-b border-telegram-hint/20 last:border-b-0 pb-3 last:pb-0">
                  <div className="flex items-start space-x-3">
                    {shop.logo ? (
                      <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-telegram-button rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-telegram-button-text" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-telegram-text">{shop.name}</h4>
                      {shop.businessInfo?.phone && (
                        <div className="flex items-center space-x-2 mt-1">
                          <Phone className="w-3 h-3 text-telegram-hint" />
                          <a 
                            href={`tel:${shop.businessInfo.phone}`}
                            className="text-sm text-telegram-button hover:underline"
                          >
                            {shop.businessInfo.phone}
                          </a>
                        </div>
                      )}
                      {shop.businessInfo?.email && (
                        <div className="flex items-center space-x-2 mt-1">
                          <Mail className="w-3 h-3 text-telegram-hint" />
                          <a 
                            href={`mailto:${shop.businessInfo.email}`}
                            className="text-sm text-telegram-button hover:underline"
                          >
                            {shop.businessInfo.email}
                          </a>
                        </div>
                      )}
                      {shop.businessInfo?.address && (
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="w-3 h-3 text-telegram-hint" />
                          <p className="text-sm text-telegram-hint">{shop.businessInfo.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-telegram-hint">No shop contact information available.</p>
          )}
        </div>

        {/* FAQ Section */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3">Frequently Asked Questions</h3>
          <div className="space-y-2">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-telegram-text hover:text-telegram-button">
                How do I track my order?
              </summary>
              <p className="text-sm text-telegram-hint mt-2 pl-4">
                You can track your order status in the Profile section under "Your Orders". You'll receive notifications for status updates.
              </p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-telegram-text hover:text-telegram-button">
                How do I cancel an order?
              </summary>
              <p className="text-sm text-telegram-hint mt-2 pl-4">
                Orders can be cancelled within 5 minutes of placing them. Contact the shop directly for cancellations after this period.
              </p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-telegram-text hover:text-telegram-button">
                What payment methods are accepted?
              </summary>
              <p className="text-sm text-telegram-hint mt-2 pl-4">
                Payment methods vary by shop. Most shops accept cash on delivery, mobile money, and bank transfers.
              </p>
            </details>
          </div>
        </div>

        {/* App Information */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3">App Information</h3>
          <div className="space-y-2 text-sm text-telegram-hint">
            <div className="flex justify-between">
              <span>Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>Dec 2024</span>
            </div>
            <div className="flex justify-between">
              <span>Platform:</span>
              <span>Telegram Mini App</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedOrder) {
    return (
      <div className="p-4 space-y-4">
        {/* Order Details Header */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setSelectedOrder(null)}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowRight className="w-5 h-5 text-telegram-text rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Order Details</h2>
            <p className="text-sm text-telegram-hint">#{selectedOrder.id.slice(-8)}</p>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-telegram-text">Order Status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(selectedOrder.status)}`}>
              {getStatusIcon(selectedOrder.status)}
              <span className="capitalize">{selectedOrder.status.replace('_', ' ')}</span>
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-telegram-hint">Order Date:</span>
              <span className="text-telegram-text">{formatDate(selectedOrder.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Payment Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedOrder.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Delivery Method:</span>
              <span className="text-telegram-text capitalize">{selectedOrder.deliveryMethod}</span>
            </div>
            {selectedOrder.trackingNumber && (
              <div className="flex justify-between">
                <span className="text-telegram-hint">Tracking:</span>
                <span className="text-telegram-text font-mono">{selectedOrder.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3">Items Ordered</h3>
          <div className="space-y-3">
            {selectedOrder.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-telegram-text">{item.productName}</h4>
                  <p className="text-xs text-telegram-hint">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <div className="text-sm font-medium text-telegram-text">
                  ${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-telegram-hint/20 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-telegram-hint">Subtotal:</span>
              <span className="text-telegram-text">${selectedOrder.subtotal.toFixed(2)}</span>
            </div>
            {selectedOrder.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-telegram-hint">Tax:</span>
                <span className="text-telegram-text">${selectedOrder.tax.toFixed(2)}</span>
              </div>
            )}
            {selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-telegram-hint">Delivery Fee:</span>
                <span className="text-telegram-text">${selectedOrder.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-telegram-text border-t border-telegram-hint/20 pt-1">
              <span>Total:</span>
              <span>${selectedOrder.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer Notes */}
        {selectedOrder.customerNotes && (
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <h3 className="font-medium text-telegram-text mb-2">Notes</h3>
            <p className="text-sm text-telegram-hint">{selectedOrder.customerNotes}</p>
          </div>
        )}

        {/* Delivery Address */}
        {selectedOrder.deliveryAddress && (
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <h3 className="font-medium text-telegram-text mb-2">Delivery Address</h3>
            <p className="text-sm text-telegram-hint">{selectedOrder.deliveryAddress}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* User Info Card */}
      <div className="bg-telegram-secondary-bg rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-telegram-button rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-telegram-button-text" />
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold text-telegram-text">
              {user.firstName} {user.lastName}
            </h2>
            {user.username && (
              <p className="text-telegram-hint">@{user.username}</p>
            )}
            <div className="flex items-center space-x-1 mt-2">
              <Globe className="w-4 h-4 text-telegram-hint" />
              <span className="text-sm text-telegram-hint">
                {user.languageCode.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">{stats.totalOrders}</div>
          <div className="text-sm text-telegram-hint">Total Orders</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">${stats.totalSpent.toFixed(0)}</div>
          <div className="text-sm text-telegram-hint">Total Spent</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">{stats.pendingOrders}</div>
          <div className="text-sm text-telegram-hint">Pending</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">{stats.completedOrders}</div>
          <div className="text-sm text-telegram-hint">Completed</div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-telegram-text">Your Orders</h3>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-telegram-secondary-bg rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
            <h3 className="text-lg font-medium text-telegram-text mb-2">No Orders Yet</h3>
            <p className="text-telegram-hint">Start shopping to see your orders here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(orders) && orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-telegram-secondary-bg rounded-lg p-4 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-telegram-text">
                        Order #{order.id.slice(-8)}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-telegram-hint">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(order.createdAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Package className="w-3 h-3" />
                        <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-telegram-text">
                      ${order.total.toFixed(2)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-telegram-hint ml-auto mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <button
          onClick={handleSettingsClick}
          className="w-full bg-telegram-secondary-bg rounded-lg p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-telegram-hint" />
            <div>
              <span className="text-telegram-text">Settings</span>
              <p className="text-xs text-telegram-hint">Notifications, theme, language</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-telegram-hint" />
        </button>
        
        <button
          onClick={handleSupportClick}
          className="w-full bg-telegram-secondary-bg rounded-lg p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-5 h-5 text-telegram-hint" />
            <div>
              <span className="text-telegram-text">Support</span>
              <p className="text-xs text-telegram-hint">Help, contact info, FAQ</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-telegram-hint" />
        </button>
      </div>

      {/* App Info */}
      <div className="text-center text-telegram-hint text-sm">
        <p>Multi-Shop Mini App</p>
        <p>Version 1.0.0</p>
      </div>
    </div>
  )
}

export default UserProfile