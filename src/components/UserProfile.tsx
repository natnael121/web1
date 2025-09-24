import React from 'react'
import { usePopup } from '@telegram-apps/sdk-react'
import { User } from '../types'
import { User as UserIcon, Globe, MessageCircle, Settings } from 'lucide-react'

interface UserProfileProps {
  user: User | null
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const popup = usePopup()

  const handleSettingsClick = () => {
    if (popup) {
      popup.open({
        title: 'Settings',
        message: 'Settings feature coming soon!',
        buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
      })
    }
  }

  const handleSupportClick = () => {
    if (popup) {
      popup.open({
        title: 'Support',
        message: 'Support feature coming soon!',
        buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
      })
    }
  }

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
          <div className="text-2xl font-bold text-telegram-text">0</div>
          <div className="text-sm text-telegram-hint">Orders</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">0</div>
          <div className="text-sm text-telegram-hint">Favorites</div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <button
          onClick={handleSettingsClick}
          className="w-full bg-telegram-secondary-bg rounded-lg p-4 flex items-center space-x-3 text-left hover:opacity-80 transition-opacity"
        >
          <Settings className="w-5 h-5 text-telegram-hint" />
          <span className="text-telegram-text">Settings</span>
        </button>
        
        <button
          onClick={handleSupportClick}
          className="w-full bg-telegram-secondary-bg rounded-lg p-4 flex items-center space-x-3 text-left hover:opacity-80 transition-opacity"
        >
          <MessageCircle className="w-5 h-5 text-telegram-hint" />
          <span className="text-telegram-text">Support</span>
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