export interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  languageCode: string
  telegramId?: number
}

export interface UserData {
  telegram_id: number
  first_name: string
  last_name: string
  username: string
  created_at: string
  updated_at: Date
  last_shop_id: string
  shops: {
    [shopId: string]: {
      last_interacted: Date
    }
  }
}

export interface Shop {
  id: string
  name: string
  description: string
  imageUrl: string
  category: string
  rating: number
  isActive: boolean
  address?: string
  phone?: string
  hours?: string
  createdAt: Date
  updatedAt: Date
  lastInteracted?: Date
}

export interface Product {
  id: string
  shopId: string
  name: string
  description: string
  price: number
  imageUrl: string
  category: string
  inStock: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  userId: string
  shopId: string
  products: OrderProduct[]
  totalAmount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface OrderProduct {
  productId: string
  name: string
  price: number
  quantity: number
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        initDataUnsafe?: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
          }
        }
      }
    }
  }
}