import React from 'react'
import { Category } from '../../types'
import { Edit, Trash2 } from 'lucide-react'

interface CategoryCardProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onDelete }) => {
  return (
    <div className="bg-telegram-secondary-bg rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            {category.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-telegram-text">{category.name}</h4>
            {category.description && (
              <p className="text-sm text-telegram-hint mt-1">{category.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-telegram-hint">
                {category.productCount || 0} products
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {category.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(category)}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CategoryCard