export interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  languageCode: string
}

export interface Shop {
  id: string
  name: string
  description: string
  imageUrl: string
  category: string
  rating: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
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