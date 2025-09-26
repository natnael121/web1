import React from 'react'
import { Product } from '../../types'
import { Package, FileEdit as Edit, Trash2, Star, AlertTriangle } from 'lucide-react'

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (productId: string) => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  const isLowStock = product.stock <= product.lowStockAlert

  return (
    <div className="bg-telegram-secondary-bg rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            {product.images && product.images[0] ? (
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-16 h-16 rounded-lg object-cover" 
              />
            ) : (
              <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-telegram-hint" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-telegram-text">{product.name}</h4>
                {product.featured && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
                {isLowStock && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-telegram-hint mt-1 line-clamp-2">{product.description}</p>
              {product.sku && (
                <p className="text-xs text-telegram-hint mt-1">SKU: {product.sku}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-bold text-telegram-button">
                ${product.price.toFixed(2)}
              </span>
              {product.costPrice && (
                <span className="text-sm text-telegram-hint">
                  Cost: ${product.costPrice.toFixed(2)}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.stock > product.lowStockAlert 
                  ? 'bg-green-100 text-green-800' 
                  : product.stock > 0
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                Stock: {product.stock}
              </span>
              
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="text-xs bg-telegram-button bg-opacity-10 text-telegram-button px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
              {product.tags.length > 3 && (
                <span className="text-xs text-telegram-hint">+{product.tags.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard