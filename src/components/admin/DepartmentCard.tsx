import React from 'react'
import { Department } from '../../types'
import { Edit, Trash2, MessageCircle } from 'lucide-react'

interface DepartmentCardProps {
  department: Department
  onEdit: (department: Department) => void
  onDelete: (departmentId: string) => void
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department, onEdit, onDelete }) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'kitchen': return 'bg-orange-100 text-orange-800'
      case 'cashier': return 'bg-green-100 text-green-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'delivery': return 'bg-blue-100 text-blue-800'
      case 'sales': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-telegram-secondary-bg rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="text-2xl">{department.icon}</div>
          <div className="flex-1">
            <h4 className="font-medium text-telegram-text">{department.name}</h4>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${getRoleColor(department.role)}`}>
                {department.role}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                department.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {department.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center space-x-1 mt-2 text-xs text-telegram-hint">
              <MessageCircle className="w-3 h-3" />
              <span>Chat ID: {department.telegramChatId}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(department)}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(department.id)}
            className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DepartmentCard