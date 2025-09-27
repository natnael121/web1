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
import { telegramService } from '../services/telegram'
import { Store, Plus, FileEdit as Edit, Trash2, Save, X, Package, DollarSign, Image, FileText, Star, MapPin, Phone, Clock, Users, BarChart3, Bell, ShoppingCart, Tag, User, ArrowLeft } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'departments' | 'analytics'>('products')
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddDepartment, setShowAddDepartment] = useState(false)
  const [showAddShop, setShowAddShop] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (user?.id) {
      loadUserData()
    } else {
      setLoading(false)
      setError('Please open this app from Telegram to access the admin panel.')
    }
  }, [user])

  const loadUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        setError('No user information available')
        setLoading(false)
        return
      }

      // Get user document from Firebase using Telegram ID
      const usersRef = collection(db, 'users')
      // Try both telegramId and telegram_id fields to handle different data structures
      let userSnapshot = await getDocs(query(usersRef, where('telegramId', '==', parseInt(user.id))))
      
      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegram_id', '==', parseInt(user.id))))
      }
      
      // If still empty, try with string ID
      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegramId', '==', user.id)))
      }
      
      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegram_id', '==', user.id)))
      }
      
      if (userSnapshot.empty) {
        setError('User not found in database. Please complete your registration first.')
        setLoading(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      setUserData({
        ...userData,
        uid: userDoc.id,
        createdAt: userData.createdAt?.toDate?.() || new Date(),
        updatedAt: userData.updatedAt?.toDate?.() || new Date()
      })

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
    if (!shopId) {
      console.error('No shop ID provided')
      return
    }
    
    await Promise.all([
      fetchShopProducts(shopId),
      fetchShopCategories(shopId),
      fetchShopDepartments(shopId),
      fetchShopStats(shopId)
    ])
  }

  const fetchShopProducts = async (shopId: string) => {
    try {
      if (!shopId) return
      
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
      // Don't set error for missing orderBy index, just log it
      if (error.code === 'failed-precondition') {
        console.warn('Firestore index missing for products orderBy query')
        // Try without orderBy
        try {
          const productsRef = collection(db, 'products')
          const productsQuery = query(productsRef, where('shopId', '==', shopId))
          const productsSnapshot = await getDocs(productsQuery)
          
          const productsList: Product[] = []
          productsSnapshot.forEach((doc) => {
            const data = doc.data()
            const product: Product = {
              id: doc.id,
              shopId: data.shopId,
              name: data.name || 'Unnamed Product',
              description: data.description || '',
              price: data.price || 0,
              stock: data.stock || 0,
              category: data.category || '',
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
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          setProducts([])
        }
      } else {
        setError('Failed to load products. Please try again.')
        setProducts([])
      }
    }
  }

  const fetchShopCategories = async (shopId: string) => {
    try {
      if (!shopId) return
      
      const categoriesRef = collection(db, 'categories')
      const categoriesQuery = query(
        categoriesRef, 
        where('shopId', '==', shopId),
        orderBy('order', 'asc')
      )
      const categoriesSnapshot = await getDocs(categoriesQuery)
      
      const categoriesList: Category[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        const category: Category = {
          id: doc.id,
          userId: data.userId,
          shopId: data.shopId,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          order: data.order || 0,
          isActive: data.isActive !== false,
          productCount: data.productCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        categoriesList.push(category)
      })

      setCategories(categoriesList)
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Handle missing index gracefully
      if (error.code === 'failed-precondition') {
        try {
          const categoriesRef = collection(db, 'categories')
          const categoriesQuery = query(categoriesRef, where('shopId', '==', shopId))
          const categoriesSnapshot = await getDocs(categoriesQuery)
          
          const categoriesList: Category[] = []
          categoriesSnapshot.forEach((doc) => {
            const data = doc.data()
            const category: Category = {
              id: doc.id,
              userId: data.userId || '',
              shopId: data.shopId || '',
              name: data.name || '',
              description: data.description,
              color: data.color || '#3B82F6',
              icon: data.icon || '📦',
              order: data.order || 0,
              isActive: data.isActive !== false,
              productCount: data.productCount || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            }
            categoriesList.push(category)
          })
          setCategories(categoriesList)
        } catch (fallbackError) {
          console.error('Fallback categories query failed:', fallbackError)
          setCategories([])
        }
      } else {
        setCategories([])
      }
    }
  }

  const fetchShopDepartments = async (shopId: string) => {
    try {
      if (!shopId) return
      
      const departmentsRef = collection(db, "departments")
      const departmentsQuery = query(
        departmentsRef,
        where("shopId", "==", shopId),
        orderBy("order", "asc")
      )
      const departmentsSnapshot = await getDocs(departmentsQuery)

      const departmentsList: Department[] = departmentsSnapshot.docs.map((doc) => {
        const data = doc.data()

        return {
          id: doc.id,
          userId: data.userId || "",
          shopId: data.shopId || "",
          name: data.name || "",
          telegramChatId: data.telegramChatId || "",
          adminChatId: data.adminChatId || "",
          role: data.role || "",
          order: typeof data.order === "number" ? data.order : 0,
          icon: data.icon || "",
          isActive: data.isActive !== false,
          notificationTypes: data.notificationTypes || [],
          createdAt:
            data.createdAt?.toDate?.() ??
            (data.createdAt ? new Date(data.createdAt) : new Date()),
          updatedAt:
            data.updatedAt?.toDate?.() ??
            (data.updatedAt ? new Date(data.updatedAt) : new Date()),
        }
      })

      setDepartments(departmentsList)
    } catch (error) {
      console.error("Error fetching departments:", error)
      // Handle missing index gracefully
      if (error.code === 'failed-precondition') {
        try {
          const departmentsRef = collection(db, "departments")
          const departmentsQuery = query(departmentsRef, where("shopId", "==", shopId))
          const departmentsSnapshot = await getDocs(departmentsQuery)
          
          const departmentsList: Department[] = departmentsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              userId: data.userId || "",
              shopId: data.shopId || "",
              name: data.name || "",
              telegramChatId: data.telegramChatId || "",
              adminChatId: data.adminChatId || "",
              role: data.role || "shop",
              order: typeof data.order === "number" ? data.order : 0,
              icon: data.icon || "👥",
              isActive: data.isActive !== false,
              notificationTypes: data.notificationTypes || [],
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
            }
          })
          setDepartments(departmentsList)
        } catch (fallbackError) {
          console.error('Fallback departments query failed:', fallbackError)
          setDepartments([])
        }
      } else {
        setDepartments([])
      }
    }
  }

  const fetchShopStats = async (shopId: string) => {
    try {
      if (!shopId) return
      
      // Get product count
      const productsRef = collection(db, 'products')
      const productsQuery = query(productsRef, where('shopId', '==', shopId), where('isActive', '==', true))
      const productsSnapshot = await getDocs(productsQuery)
      const totalProducts = productsSnapshot.size
      
      // Get order stats
      const ordersRef = collection(db, 'orders')
      const ordersQuery = query(ordersRef, where('shopId', '==', shopId))
      const ordersSnapshot = await getDocs(ordersQuery)
      
      let totalOrders = 0
      let totalRevenue = 0
      const customerIds = new Set<string>()
      
      ordersSnapshot.forEach((doc) => {
        const data = doc.data()
        totalOrders++
        totalRevenue += data.total || 0
        if (data.customerId) {
          customerIds.add(data.customerId)
        }
      })
      
      const totalCustomers = customerIds.size

      setStats({
        totalProducts,
        totalOrders,
        totalRevenue,
        totalCustomers
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats on error
      setStats({
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0
      })
    }
  }

  const handleShopSelect = async (shop: Shop) => {
    if (!shop || !shop.id) {
      console.error('Invalid shop selected')
      return
    }
    
    setSelectedShop(shop)
    setActiveTab('products')
    setError(null)
    await fetchShopData(shop.id)
  }

  const handleCreateShop = async (shopData: any) => {
    try {
      setError(null)
      
      if (!userData) {
        setError('User data not available')
        return
      }

      const shopsRef = collection(db, 'shops')
      const newShop = {
        ...shopData,
        ownerId: userData.uid || userData.id,
        isActive: true,
        stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await addDoc(shopsRef, newShop)
      setShowAddShop(false)
      await loadUserData()
      
      // Show success message
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Shop created successfully!')
      }
    } catch (error) {
      console.error('Error creating shop:', error)
      setError('Failed to create shop. Please try again.')
    }
  }

  const handleSaveProduct = async (productData: any) => {
    try {
      setError(null)
      
      if (editingProduct) {
        // Update existing product
        const productRef = doc(db, 'products', editingProduct.id)
        await updateDoc(productRef, {
          ...productData,
          updatedAt: new Date()
        })
      } else {
        // Add new product
        const productsRef = collection(db, 'products')
        await addDoc(productsRef, {
          ...productData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      setEditingProduct(null)
      setShowAddProduct(false)
      if (selectedShop) {
        await fetchShopProducts(selectedShop.id)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setError('Failed to save product. Please try again.')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      if (!productId) {
        setError('Invalid product ID')
        return
      }
      
      setError(null)
      const productRef = doc(db, 'products', productId)
      await deleteDoc(productRef)
      
      if (selectedShop) {
        await fetchShopProducts(selectedShop.id)
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      setError('Failed to delete product. Please try again.')
    }
  }

  const handleSaveCategory = async (categoryData: any) => {
    try {
      setError(null)
      
      if (editingCategory) {
        // Update existing category
        const categoryRef = doc(db, 'categories', editingCategory.id)
        await updateDoc(categoryRef, {
          ...categoryData,
          updatedAt: new Date()
        })
      } else {
        // Add new category
        const categoriesRef = collection(db, 'categories')
        await addDoc(categoriesRef, {
          ...categoryData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      setEditingCategory(null)
      setShowAddCategory(false)
      if (selectedShop) {
        await fetchShopCategories(selectedShop.id)
      }
    } catch (error) {
      console.error('Error saving category:', error)
      setError('Failed to save category. Please try again.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (!categoryId) {
        setError('Invalid category ID')
        return
      }
      
      setError(null)
      const categoryRef = doc(db, 'categories', categoryId)
      await deleteDoc(categoryRef)
      
      if (selectedShop) {
        await fetchShopCategories(selectedShop.id)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setError('Failed to delete category. Please try again.')
    }
  }

  const handleSaveDepartment = async (departmentData: any) => {
    try {
      setError(null)
      
      if (editingDepartment) {
        // Update existing department
        const departmentRef = doc(db, 'departments', editingDepartment.id)
        await updateDoc(departmentRef, {
          ...departmentData,
          updatedAt: new Date()
        })
      } else {
        // Add new department
        const departmentsRef = collection(db, 'departments')
        await addDoc(departmentsRef, {
          ...departmentData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      setEditingDepartment(null)
      setShowAddDepartment(false)
      if (selectedShop) {
        await fetchShopDepartments(selectedShop.id)
      }
    } catch (error) {
      console.error('Error saving department:', error)
      setError('Failed to save department. Please try again.')
    }
  }

  const handleDeleteDepartment = async (departmentId: string) => {
    try {
      if (!departmentId) {
        setError('Invalid department ID')
        return
      }
      
      setError(null)
      const departmentRef = doc(db, 'departments', departmentId)
      await deleteDoc(departmentRef)
      
      if (selectedShop) {
        await fetchShopDepartments(selectedShop.id)
      }
    } catch (error) {
      console.error('Error deleting department:', error)
      setError('Failed to delete department. Please try again.')
    }
  }

  const handlePromoteProduct = (product: Product) => {
    if (!product || !product.id) {
      setError('Invalid product selected for promotion')
      return
    }
    
    setPromotingProduct(product)
    setShowPromotionModal(true)
  }

  const handlePromotionSubmit = async (promotionData: any) => {
    try {
      setError(null)
      
      const { 
        product, 
        customMessage, 
        promotionImages, 
        promotionTitle, 
        discountPercentage, 
        validUntil, 
        tags, 
        isScheduled, 
        scheduledDate, 
        selectedDepartments 
      } = promotionData

      // Generate promotion message
      const discountText = discountPercentage > 0 ? `\n💥 <b>${discountPercentage}% OFF!</b>` : ''
      const originalPrice = discountPercentage > 0 ? `\n~~$${product.price.toFixed(2)}~~ ` : ''
      const discountedPrice = discountPercentage > 0 ? `<b>$${(product.price * (1 - discountPercentage / 100)).toFixed(2)}</b>` : `<b>$${product.price.toFixed(2)}</b>`
      const validUntilText = validUntil ? `\n⏰ <b>Valid until:</b> ${validUntil.toLocaleDateString()}` : ''
      const tagsText = tags.length > 0 ? `\n\n${tags.join(' ')}` : ''
      
      const message = `
🔥 <b>${promotionTitle}</b>${discountText}

🛍️ <b>${product.name}</b>

${customMessage || product.description}

💰 <b>Price:</b> ${originalPrice}${discountedPrice}
📦 <b>Available:</b> ${product.stock} in stock
${product.sku ? `🏷️ <b>SKU:</b> ${product.sku}` : ''}${validUntilText}

🛒 <b>Order Now!</b> Don't miss this amazing deal!${tagsText}

<i>🚀 Limited time offer - Order today!</i>
      `.trim()

      const promotionMessage = {
        text: message,
        images: promotionImages.length > 0 ? promotionImages : (product.images.length > 0 ? [product.images[0]] : undefined),
        parseMode: 'HTML' as const
      }

      // Send to selected departments or all active departments if none selected
      const targetDepartments = selectedDepartments.length > 0 
        ? departments.filter(d => selectedDepartments.includes(d.id))
        : departments.filter(d => d.isActive)

      const botToken = process.env.TELEGRAM_BOT_TOKEN || import.meta.env.VITE_TELEGRAM_BOT_TOKEN
      
      if (!botToken) {
        throw new Error('Telegram bot token not configured')
      }

      // Send or schedule promotion
      for (const department of targetDepartments) {
        if (!department.telegramChatId) {
          console.warn(`Department ${department.name} has no Telegram chat ID`)
          continue
        }
        
        const config = {
          botToken,
          chatId: department.telegramChatId
        }

        if (isScheduled && scheduledDate) {
          await telegramService.scheduleMessage(config, promotionMessage, scheduledDate)
        } else {
          await telegramService.sendPromotionMessage(config, promotionMessage)
        }
      }

      setShowPromotionModal(false)
      setPromotingProduct(null)
    } catch (error) {
      console.error('Error promoting product:', error)
      setError('Failed to promote product. Please check your Telegram bot configuration.')
    }
  }

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
          <button
            onClick={loadUserData}
            className="mt-4 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-4 pb-20">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-telegram-text">Shop Manager</h1>
        <div className="text-xs text-telegram-hint">
          {userData.displayName || userData.email}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {/* Shops Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-telegram-text">Your Shops</h2>
          <button
            onClick={() => setShowAddShop(true)}
            className="bg-telegram-button text-telegram-button-text px-3 py-2 rounded-lg flex items-center space-x-1 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Shop</span>
          </button>
        </div>
        
        {ownedShops.length > 0 ? (
          <div className="grid gap-3">
            {ownedShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                onEdit={setEditingShop}
                onSelect={handleShopSelect}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-telegram-secondary-bg rounded-lg">
            <Store className="w-12 h-12 mx-auto text-telegram-hint mb-3" />
            <h3 className="text-base font-medium text-telegram-text mb-2">No Shops Yet</h3>
            <p className="text-sm text-telegram-hint mb-4">
              Create your first shop to start managing products and orders.
            </p>
            <button
              onClick={() => setShowAddShop(true)}
              className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm"
            >
              Create Shop
            </button>
          </div>
        )}
      </div>

      {/* Shop Management - Only show if a shop is selected */}
      {selectedShop && (
        <div className="space-y-4">
          {/* Shop Header */}
          <div className="flex items-center justify-between bg-telegram-secondary-bg rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedShop(null)}
                className="p-2 text-telegram-hint hover:text-telegram-text rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-telegram-text">{selectedShop.name}</h2>
                <p className="text-xs text-telegram-hint">Shop Management</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-telegram-secondary-bg rounded-lg p-1 overflow-x-auto">
            {[
              { id: 'products', label: 'Products', icon: Package },
              { id: 'categories', label: 'Categories', icon: Tag },
              { id: 'departments', label: 'Departments', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md flex-1 justify-center min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-telegram-button text-telegram-button-text'
                    : 'text-telegram-hint hover:text-telegram-text'
                }`}
              >
                <tab.icon className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-telegram-text">Products</h3>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-telegram-button text-telegram-button-text px-3 py-2 rounded-lg flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="space-y-2">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={setEditingProduct}
                    onDelete={handleDeleteProduct}
                    onPromote={handlePromoteProduct}
                  />
                ))}
              </div>

              {products.length === 0 && (
                <div className="text-center py-6">
                  <Package className="w-12 h-12 mx-auto text-telegram-hint mb-3" />
                  <h3 className="text-base font-medium text-telegram-text mb-2">No Products Yet</h3>
                  <p className="text-sm text-telegram-hint mb-4">Add your first product to get started.</p>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm"
                  >
                    Add Product
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-telegram-text">Categories</h3>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="bg-telegram-button text-telegram-button-text px-3 py-2 rounded-lg flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={setEditingCategory}
                    onDelete={handleDeleteCategory}
                  />
                ))}
              </div>

              {categories.length === 0 && (
                <div className="text-center py-6">
                  <Tag className="w-12 h-12 mx-auto text-telegram-hint mb-3" />
                  <h3 className="text-base font-medium text-telegram-text mb-2">No Categories Yet</h3>
                  <p className="text-sm text-telegram-hint mb-4">Add categories to organize your products.</p>
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm"
                  >
                    Add Category
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-telegram-text">Departments</h3>
                <button
                  onClick={() => setShowAddDepartment(true)}
                  className="bg-telegram-button text-telegram-button-text px-3 py-2 rounded-lg flex items-center space-x-1 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Department</span>
                </button>
              </div>

              <div className="space-y-2">
                {departments.map((department) => (
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    onEdit={setEditingDepartment}
                    onDelete={handleDeleteDepartment}
                  />
                ))}
              </div>

              {departments.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-12 h-12 mx-auto text-telegram-hint mb-3" />
                  <h3 className="text-base font-medium text-telegram-text mb-2">No Departments Yet</h3>
                  <p className="text-sm text-telegram-hint mb-4">Add departments for Telegram notifications.</p>
                  <button
                    onClick={() => setShowAddDepartment(true)}
                    className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm"
                  >
                    Add Department
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab shop={selectedShop} stats={stats} />
          )}
        </div>
      )}

      {/* Product Edit Modal */}
      {(editingProduct || showAddProduct) && (
        <ProductEditModal
          product={editingProduct || undefined}
          shopId={selectedShop?.id || ''}
          categories={categories}
          onSave={handleSaveProduct}
          onCancel={() => {
            setEditingProduct(null)
            setShowAddProduct(false)
          }}
        />
      )}

      {/* Category Edit Modal */}
      {(editingCategory || showAddCategory) && userData && selectedShop && (
        <CategoryEditModal
          category={editingCategory || undefined}
          userId={userData.uid}
          shopId={selectedShop.id}
          onSave={handleSaveCategory}
          onCancel={() => {
            setEditingCategory(null)
            setShowAddCategory(false)
          }}
        />
      )}

      {/* Department Edit Modal */}
      {(editingDepartment || showAddDepartment) && userData && selectedShop && (
        <DepartmentEditModal
          department={editingDepartment || undefined}
          userId={userData.uid}
          shopId={selectedShop.id}
          onSave={handleSaveDepartment}
          onCancel={() => {
            setEditingDepartment(null)
            setShowAddDepartment(false)
          }}
        />
      )}

      {/* Shop Edit Modal */}
      {editingShop && (
        <ShopEditModal
          shop={editingShop}
          onSave={async (updatedShop) => {
            try {
              const shopRef = doc(db, 'shops', updatedShop.id)
              await updateDoc(shopRef, {
                ...updatedShop,
                updatedAt: new Date()
              })
              setEditingShop(null)
              await loadUserData()
            } catch (error) {
              console.error('Error updating shop:', error)
              setError('Failed to update shop. Please try again.')
            }
          }}
          onCancel={() => setEditingShop(null)}
        />
      )}

      {/* Add Shop Modal */}
      {showAddShop && userData && (
        <ShopCreateModal
          userId={userData.uid}
          onSave={handleCreateShop}
          onCancel={() => setShowAddShop(false)}
        />
      )}

      {/* Promotion Modal */}
      {showPromotionModal && promotingProduct && (
        <PromotionModal
          product={promotingProduct}
          departments={departments}
          onClose={() => {
            setShowPromotionModal(false)
            setPromotingProduct(null)
          }}
          onPromote={handlePromotionSubmit}
        />
      )}
    </div>
  )
} 

// Import required components
import ProductCard from './admin/ProductCard'
import ProductEditModal from './admin/ProductEditModal'
import { PromotionModal } from './admin/PromotionModal'
import CategoryCard from './admin/CategoryCard'
import CategoryEditModal from './admin/CategoryEditModal'
import DepartmentCard from './admin/DepartmentCard'
import DepartmentEditModal from './admin/DepartmentEditModal'
import ShopCard from './admin/ShopCard'
import ShopEditModal from './admin/ShopEditModal'
import ShopCreateModal from './admin/ShopCreateModal'
import AnalyticsTab from './admin/AnalyticsTab'

export default AdminPanel