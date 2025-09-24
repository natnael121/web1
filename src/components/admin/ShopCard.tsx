import React from 'react'
import { Shop } from '../../types'
import { Store, Package, ShoppingCart, DollarSign, Users, Edit, BarChart3 } from 'lucide-react'

interface ShopCardProps {
  shop: Shop
  onEdit: (shop: Shop) => void
  onSelect: (shop: Shop) => void
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, onEdit, onSelect }) => {
  return (
    <div className="bg-telegram-secondary-bg rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            {shop.logo && (
              <img src={shop.logo} alt={shop.name} className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div>
              <h3 className="font-semibold text-telegram-text">{shop.name}</h3>
              <p className="text-sm text-telegram-hint mt-1">{shop.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-2 text-xs text-telegram-hint">
            <span className="flex items-center">
              <Package className="w-3 h-3 mr-1" />
              {shop.stats?.totalProducts || 0} products
            </span>
            <span className="flex items-center">
              <ShoppingCart className="w-3 h-3 mr-1" />
              {shop.stats?.totalOrders || 0} orders
            </span>
            <span className="flex items-center">
              <DollarSign className="w-3 h-3 mr-1" />
              ${shop.stats?.totalRevenue?.toFixed(2) || '0.00'}
            </span>
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {shop.stats?.totalCustomers || 0} customers
            </span>
            <span className={`px-2 py-1 rounded-full ${
              shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {shop.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(shop)}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelect(shop)}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShopCard