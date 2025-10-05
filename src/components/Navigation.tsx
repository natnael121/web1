import React from 'react'
import { Store, User, Settings } from 'lucide-react'
import { UserData } from '../types'

interface NavigationProps {
  currentView: 'shops' | 'profile' | 'admin'
  onViewChange: (view: 'shops' | 'profile' | 'admin') => void
  userData?: UserData | null
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange, userData }) => {
  const showProfileNotification = userData && !userData.profileCompleted
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-telegram-secondary-bg border-t border-gray-200">
      <div className="max-w-md mx-auto flex">
        <button
          onClick={() => onViewChange('shops')}
          className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 transition-colors ${
            currentView === 'shops'
              ? 'text-telegram-button'
              : 'text-telegram-hint'
          }`}
        >
          <Store className="w-6 h-6" />
          <span className="text-xs font-medium">Shops</span>
        </button>
        
        <button
          onClick={() => onViewChange('profile')}
          className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 transition-colors relative ${
            currentView === 'profile'
              ? 'text-telegram-button'
              : 'text-telegram-hint'
          }`}
        >
          <div className="relative">
            <User className="w-6 h-6" />
            {showProfileNotification && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Profile</span>
        </button>
        
        <button
          onClick={() => onViewChange('admin')}
          className={`flex-1 py-3 px-4 flex flex-col items-center space-y-1 transition-colors ${
            currentView === 'admin'
              ? 'text-telegram-button'
              : 'text-telegram-hint'
          }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs font-medium">Admin</span>
        </button>
      </div>
    </nav>
  )
}

export default Navigation