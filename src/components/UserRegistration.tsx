import React, { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { User, UserData } from '../types'
import { Store, User as UserIcon, Mail, Save, Loader2 } from 'lucide-react'

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
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get current timestamp
      const now = new Date()
      
      const userData = {
        createdAt: now,
        displayName: formData.displayName,
        email: formData.email,
        telegramId: user.telegramId || parseInt(user.id),
        updatedAt: now,
      }

      const usersRef = collection(db, 'users')
      const docRef = await addDoc(usersRef, userData)

      // Create the complete user data with the UID
      const completeUserData: UserData = {
        ...userData,
        uid: docRef.id // This will be the auto-generated Firestore document ID
      }

      onComplete(completeUserData)
    } catch (error) {
      console.error('Error creating user:', error)
      setError('Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
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

          <div className="space-y-4">
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