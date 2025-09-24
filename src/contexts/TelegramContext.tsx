import React, { createContext, useContext, useEffect, useState } from 'react'

interface TelegramContextType {
  webApp: any
  user: any
  isReady: boolean
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined)

export const useTelegram = () => {
  const context = useContext(TelegramContext)
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider')
  }
  return context
}

interface TelegramProviderProps {
  children: React.ReactNode
}

export const TelegramProvider: React.FC<TelegramProviderProps> = ({ children }) => {
  const [webApp, setWebApp] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      setWebApp(tg)
      setUser(tg.initDataUnsafe?.user)
      setIsReady(true)
      
      // Configure the app
      tg.ready()
      tg.expand()
    } else {
      // For development/testing outside Telegram
      setIsReady(true)
    }
  }, [])

  const value = {
    webApp,
    user,
    isReady
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}