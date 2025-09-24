import React, { useEffect, useState } from 'react'
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  orderBy 
} from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop, Product, Category, Department, UserData } from '../types'
import { 
  Store, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Package, 
  DollarSign,
  Image,
  FileText,
  Star,
  MapPin,
  Phone,
  Clock,
  Users,
  BarChart3,
  Bell,
  ShoppingCart,
  Tag,
  User
} from 'lucide-react'

const AdminPanel: React.FC = () => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [ownedShops, setOwnedShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'departments' | 'analytics' | 'profile'>('profile')
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddDepartment, setShowAddDepartment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (user?.id) {
      loadUserData()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        setError('No user information available')
        return
      }

      // Get user document from Firebase using Telegram ID
      const usersRef = collection(db, 'users')
      const userQuery = query(usersRef, where('telegramId', '==', parseInt(user.id)))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        setError('User not found in database')
        setLoading(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      setUserData(userData)

      // Find shops owned by this user (if any)
      const shopsRef = collection(db, 'shops')
      const ownerQuery = query(shopsRef, where('ownerId', '==', userDoc.id))
      const shopsSnapshot = await getDocs(ownerQuery)

      const shopsList: Shop[] = []
      shopsSnapshot.forEach((doc) => {
        const data = doc.data()
        const shop: Shop = {
          id: doc.id,
          ownerId: data.ownerId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          logo: data.logo,
          isActive: data.isActive !== false,
          businessInfo: data.businessInfo || {},
          settings: data.settings || {
            currency: 'USD',
            taxRate: 0,
            businessHours: { open: '09:00', close: '18:00', days: [] },
            orderSettings: { autoConfirm: false, requirePayment: false, allowCancellation: true }
          },
          stats: data.stats || { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        shopsList.push(shop)
      })

      setOwnedShops(shopsList)
      
    } catch (error) {
      console.error('Error loading user data:', error)
      setError('Failed to load user data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchShopData = async (shopId: string) => {
    await Promise.all([
      fetchShopProducts(shopId),
      fetchShopCategories(shopId),
      fetchShopDepartments(shopId),
      fetchShopStats(shopId)
    ])
  }

  const fetchShopProducts = async (shopId: string) => {
    try {
      const productsRef = collection(db, 'products')
      const productsQuery = query(
        productsRef, 
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc')
      )
      const productsSnapshot = await getDocs(productsQuery)
      
      const productsList: Product[] = []
      productsSnapshot.forEach((doc) => {
        const data = doc.data()
        const product: Product = {
          id: doc.id,
          shopId: data.shopId,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock || 0,
          category: data.category,
          subcategory: data.subcategory,
          images: data.images || [],
          sku: data.sku,
          isActive: data.isActive !== false,
          lowStockAlert: data.lowStockAlert || 5,
          tags: data.tags || [],
          featured: data.featured || false,
          costPrice: data.costPrice,
          weight: data.weight,
          dimensions: data.dimensions,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        productsList.push(product)
      })

      setProducts(productsList)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products. Please try again.')
    }
  }

  // ... rest of the functions remain the same ...

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">User Not Found</h3>
          <p className="text-telegram-hint">
            {error || 'Unable to load user data. Please try again.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-telegram-text">Admin Panel</h1>
        <div className="text-sm text-telegram-hint">
          Welcome, {userData.displayName || userData.email}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* User Profile Section - Show for all users */}
      <div className="bg-telegram-secondary-bg rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-telegram-button rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-telegram-text">
              {userData.displayName || 'User'}
            </h2>
            <p className="text-telegram-hint">{userData.email}</p>
            <p className="text-sm text-telegram-hint capitalize">Role: {userData.role}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-telegram-hint">Owned Shops</div>
            <div className="text-2xl font-bold text-telegram-button">
              {ownedShops.length}
            </div>
          </div>
        </div>
      </div>

      {/* Shops List - Only show if user has shops */}
      {ownedShops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-telegram-text">Your Shops</h2>
          
          {ownedShops.map((shop) => (
            <div key={shop.id} className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {shop.logo && (
                      <img src={shop.logo} alt={shop.name} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div>
                      <h3 className="font-semibold text-telegram-text">{shop.name}</h3>
                      <p className="text-sm text-telegram-hint mt-1">{shop.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-telegram-hint">
                    <span className="flex items-center">
                      <Package className="w-3 h-3 mr-1" />
                      {shop.stats?.totalProducts || 0} products
                    </span>
                    <span className="flex items-center">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      {shop.stats?.totalOrders || 0} orders
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingShop(shop)}
                    className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShopSelect(shop)}
                    className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Shops Message */}
      {ownedShops.length === 0 && (
        <div className="text-center py-8">
          <Store className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">No Shops Yet</h3>
          <p className="text-telegram-hint mb-4">
            You don't own any shops yet. Contact an administrator to get started.
          </p>
          <button
            onClick={() => setActiveTab('profile')}
            className="bg-telegram-button text-telegram-button-text px-6 py-2 rounded-lg"
          >
            View Profile
          </button>
        </div>
      )}

      {/* Shop Management - Only show if a shop is selected */}
      {selectedShop && (
        <div className="space-y-6">
          {/* ... shop management code remains the same ... */}
        </div>
      )}

      {/* Profile Tab for all users */}
      {!selectedShop && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-telegram-text">User Profile</h2>
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">Display Name</label>
                <div className="p-3 bg-telegram-bg rounded-lg text-telegram-text">
                  {userData.displayName || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">Email</label>
                <div className="p-3 bg-telegram-bg rounded-lg text-telegram-text">
                  {userData.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">Role</label>
                <div className="p-3 bg-telegram-bg rounded-lg text-telegram-text capitalize">
                  {userData.role}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">User ID</label>
                <div className="p-3 bg-telegram-bg rounded-lg text-telegram-text font-mono text-sm">
                  {userData.uid}
                </div>
              </div>
            </div>
            
            {userData.businessInfo && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-telegram-text mb-3">Business Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">Business Name</label>
                    <div className="p-3 bg-telegram-bg rounded-lg text-telegram-text">
                      {userData.businessInfo.name || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">Phone</label>
                    <div className="p-3 bg-telegram-bg rounded-lg text-telegram-text">
                      {userData.businessInfo.phone || 'Not set'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals - remain the same */}
      {/* ... modals code remains the same ... */}
    </div>
  )
}

// ... rest of the component code (modals) remains the same ...

export default AdminPanel