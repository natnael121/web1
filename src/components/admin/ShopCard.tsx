import React from 'react'
import { Shop } from '../../types'
import { Store, Package, ShoppingCart, DollarSign, Users, FileEdit as Edit, BarChart3, Star, Clock, MapPin, Phone } from 'lucide-react'

interface ShopCardProps {
  shop: Shop
  onEdit: (shop: Shop) => void
  onSelect: (shop: Shop) => void
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, onEdit, onSelect }) => {
  const formatCurrency = (amount: number) => {
    const currency = shop.settings?.currency || 'USD'
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'ETB' ? 'Br' : '$'
    return `${symbol}${amount.toFixed(0)}`
  }

  const getOperatingStatus = () => {
    if (!shop.settings?.businessHours) return 'Unknown'
    
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' })
    const currentTime = now.toTimeString().slice(0, 5)
    
    const { open, close, days } = shop.settings.businessHours
    
    if (!days.includes(currentDay)) return 'Closed'
    if (currentTime >= open && currentTime <= close) return 'Open'
    return 'Closed'
  }

  const operatingStatus = getOperatingStatus()

  return (
    <div className="bg-telegram-secondary-bg rounded-xl p-4 border border-telegram-hint/10 hover:border-telegram-button/30 transition-all duration-200">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          {shop.logo ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-telegram-hint/20">
              <img 
                src={shop.logo} 
                alt={shop.name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 bg-telegram-button/10 rounded-xl flex items-center justify-center">
              <Store className="w-7 h-7 text-telegram-button" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-bold text-telegram-text text-base truncate">
                {shop.name}
              </h3>
              {shop.isActive && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  operatingStatus === 'Open' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    operatingStatus === 'Open' ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                  <span>{operatingStatus}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-telegram-hint line-clamp-2 mb-2">
              {shop.description}
            </p>
            
            {/* Business Info */}
            {shop.businessInfo && (
              <div className="flex items-center space-x-3 text-xs text-telegram-hint">
                {shop.businessInfo.address && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-24">{shop.businessInfo.address}</span>
                  </div>
                )}
                {shop.businessInfo.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{shop.businessInfo.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(shop)
            }}
            className="p-2 text-telegram-hint hover:text-telegram-button hover:bg-telegram-button/10 rounded-lg transition-colors"
            title="Edit Shop"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(shop)
            }}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded-lg transition-colors"
            title="Manage Shop"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mb-1 mx-auto">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {shop.stats?.totalProducts || 0}
          </div>
          <div className="text-xs text-telegram-hint">Products</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mb-1 mx-auto">
            <ShoppingCart className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {shop.stats?.totalOrders || 0}
          </div>
          <div className="text-xs text-telegram-hint">Orders</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg mb-1 mx-auto">
            <DollarSign className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {formatCurrency(shop.stats?.totalRevenue || 0)}
          </div>
          <div className="text-xs text-telegram-hint">Revenue</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mb-1 mx-auto">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {shop.stats?.totalCustomers || 0}
          </div>
          <div className="text-xs text-telegram-hint">Customers</div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex items-center justify-between pt-3 border-t border-telegram-hint/10">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            shop.isActive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {shop.isActive ? 'Active' : 'Inactive'}
          </span>
          
          {shop.settings?.businessHours && (
            <div className="flex items-center space-x-1 text-xs text-telegram-hint">
              <Clock className="w-3 h-3" />
              <span>
                {shop.settings.businessHours.open} - {shop.settings.businessHours.close}
              </span>
            </div>
          )}
        </div>
        
        <button
          onClick={() => onSelect(shop)}
          className="bg-telegram-button text-telegram-button-text px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
        >
          Manage
        </button>
      </div>
    </div>
  )
}

export default ShopCard