import React, { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { User, UserData } from '../types'
import { Store, User as UserIcon, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react'

interface UserRegistrationProps {
  user: User
  onComplete: (userData: UserData) => void
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ user, onComplete }) => {
  const { db } = useFirebase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    displayName: `${user.firstName} ${user.lastName}`.trim(),
    email: '',
    phone: '',
    bio: '',
    role: 'shop_owner' as 'shop_owner' | 'admin',
    businessInfo: {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: ''
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const userData: Omit<UserData, 'uid' | 'createdAt' | 'updatedAt'> = {
        email: formData.email,
        displayName: formData.displayName,
        phone: formData.phone,
        bio: formData.bio,
        role: formData.role,
        telegramId: user.telegramId || parseInt(user.id),
        telegram_id: user.telegramId || parseInt(user.id), // Add both fields for compatibility
        settings: {
          notifications: {
            email: true,
            push: true,
            telegram: true
          },
          telegram: {
            chatId: user.id,
            username: user.username,
            enableNotifications: true
          },
          theme: 'auto',
          language: user.languageCode || 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        businessInfo: formData.businessInfo
      }

      const usersRef = collection(db, 'users')
      const docRef = await addDoc(usersRef, {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const completeUserData: UserData = {
        ...userData,
        uid: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      onComplete(completeUserData)
    } catch (error) {
      console.error('Error creating user:', error)
      setError('Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateBusinessInfo = (field: string, value: string) => {
    setFormData({
      ...formData,
      businessInfo: {
        ...formData.businessInfo,
        [field]: value
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-telegram-button/10 via-telegram-bg to-telegram-secondary-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-telegram-button rounded-2xl flex items-center justify-center">
              <Store className="h-8 w-8 text-telegram-button-text" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-telegram-text">
            Welcome to Multi-Shop!
          </h2>
          <p className="mt-2 text-sm text-telegram-hint">
            Complete your profile to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-telegram-text">Personal Information</h3>
            
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-telegram-text mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-telegram-hint" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-telegram-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-telegram-hint" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-telegram-text mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-telegram-hint" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-telegram-text mb-2">
                Bio (Optional)
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="block w-full px-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-telegram-text">Business Information (Optional)</h3>
            
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-telegram-text mb-2">
                Business Name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={formData.businessInfo.name}
                onChange={(e) => updateBusinessInfo('name', e.target.value)}
                className="block w-full px-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label htmlFor="businessDescription" className="block text-sm font-medium text-telegram-text mb-2">
                Business Description
              </label>
              <textarea
                id="businessDescription"
                name="businessDescription"
                rows={3}
                value={formData.businessInfo.description}
                onChange={(e) => updateBusinessInfo('description', e.target.value)}
                className="block w-full px-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                placeholder="Describe your business..."
              />
            </div>

            <div>
              <label htmlFor="businessAddress" className="block text-sm font-medium text-telegram-text mb-2">
                Business Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-telegram-hint" />
                </div>
                <input
                  id="businessAddress"
                  name="businessAddress"
                  type="text"
                  value={formData.businessInfo.address}
                  onChange={(e) => updateBusinessInfo('address', e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your business address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessPhone" className="block text-sm font-medium text-telegram-text mb-2">
                  Business Phone
                </label>
                <input
                  id="businessPhone"
                  name="businessPhone"
                  type="tel"
                  value={formData.businessInfo.phone}
                  onChange={(e) => updateBusinessInfo('phone', e.target.value)}
                  className="block w-full px-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Business phone"
                />
              </div>

              <div>
                <label htmlFor="businessEmail" className="block text-sm font-medium text-telegram-text mb-2">
                  Business Email
                </label>
                <input
                  id="businessEmail"
                  name="businessEmail"
                  type="email"
                  value={formData.businessInfo.email}
                  onChange={(e) => updateBusinessInfo('email', e.target.value)}
                  className="block w-full px-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Business email"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-telegram-button-text bg-telegram-button hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-telegram-button disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Complete Registration
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserRegistration