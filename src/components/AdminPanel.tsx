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
import { Store, Plus, FileEdit as Edit, Trash2, Save, X, Package, DollarSign, Image, FileText, Star, MapPin, Phone, Clock, Users, BarChart3, Bell, ShoppingCart, Tag, User, ArrowLeft, MessageCircle } from 'lucide-react'
import { Settings } from 'lucide-react'
import OrderManagement from './admin/OrderManagement'
import ShopCreateModal from './admin/ShopCreateModal'
import ProductCard from './admin/ProductCard'
import ProductEditModal from './admin/ProductEditModal'
import { PromotionModal } from './admin/PromotionModal'
import CategoryCard from './admin/CategoryCard'
import CategoryEditModal from './admin/CategoryEditModal'
import DepartmentCard from './admin/DepartmentCard'
import DepartmentEditModal from './admin/DepartmentEditModal'
import ShopCard from './admin/ShopCard'
import ShopEditModal from './admin/ShopEditModal'
import AnalyticsTab from './admin/AnalyticsTab'
import TelegramBotSettings from './admin/TelegramBotSettings'
import UserRegistration from './UserRegistration'
import CRMPanel from './crm/CRMPanel'
import CustomerManagement from './admin/CustomerManagement'
import { shopLinkUtils } from '../utils/shopLinks'
import { shopCustomerService } from '../services/shopCustomerService'

const AdminPanel: React.FC = () => {
  const { db } = useFirebase()
  const { user, startParam } = useTelegram()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [ownedShops, setOwnedShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'departments' | 'analytics' | 'profile' | 'orders' | 'crm' | 'customers' | 'settings'>('profile')
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddDepartment, setShowAddDepartment] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [showCreateShop, setShowCreateShop] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showBotSettings, setShowBotSettings] = useState(false)
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [botToken, setBotToken] = useState('')
  const [linkProcessed, setLinkProcessed] = useState(false)
  const [showRoleUpgrade, setShowRoleUpgrade] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadUserData()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.id && startParam && !linkProcessed && userData) {
      handleShopLink()
    }
  }, [user, startParam, linkProcessed, userData])

  const handleShopLink = async () => {
    if (!user?.id || !startParam || linkProcessed) return

    try {
      setLinkProcessed(true)
      setLoading(true)

      const displayName = userData?.displayName || user.firstName || 'Customer'

      const result = await shopCustomerService.handleShopLinkAccess(
        db,
        startParam,
        parseInt(user.id),
        displayName
      )

      if (result.success && result.shopId) {
        await loadUserData()

        const shopCustomersRef = collection(db, 'shop_customers')
        const roleQuery = query(
          shopCustomersRef,
          where('shopId', '==', result.shopId),
          where('telegramId', '==', parseInt(user.id))
        )
        const roleSnapshot = await getDocs(roleQuery)

        if (!roleSnapshot.empty) {
          const customerData = roleSnapshot.docs[0].data()
          const userRole = customerData.role

          if (userRole === 'admin') {
            const shopRef = doc(db, 'shops', result.shopId)
            const shopDoc = await getDoc(shopRef)

            if (shopDoc.exists()) {
              const shopData = shopDoc.data()
              const shop: Shop = {
                id: shopDoc.id,
                ownerId: shopData.ownerId,
                name: shopData.name,
                slug: shopData.slug,
                description: shopData.description,
                logo: shopData.logo,
                isActive: shopData.isActive,
                businessInfo: shopData.businessInfo,
                settings: shopData.settings,
                stats: shopData.stats,
                createdAt: shopData.createdAt?.toDate() || new Date(),
                updatedAt: shopData.updatedAt?.toDate() || new Date()
              }

              setSelectedShop(shop)
              setActiveTab('products')
              await fetchShopData(shop.id)
            }
          } else {
            setError('Access denied: Admin privileges required to manage this shop')
          }
        } else {
          setError('Access denied: User not found in shop customer records')
        }
      } else {
        setError(result.error || 'Failed to access shop')
      }
    } catch (error) {
      console.error('Error handling shop link:', error)
      setError('Failed to process shop link')
    } finally {
      setLoading(false)
    }
  }

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
      // Also load bot token
      setBotToken(userData.telegramBotToken || '')

      // Get shops where user has admin role in shop_customers
      const shopCustomersRef = collection(db, 'shop_customers')
      const adminQuery = query(
        shopCustomersRef,
        where('telegramId', '==', parseInt(user.id)),
        where('role', '==', 'admin')
      )
      const adminShopsSnapshot = await getDocs(adminQuery)
      const adminShopIds = adminShopsSnapshot.docs.map(doc => doc.data().shopId)

      if (adminShopIds.length === 0) {
        setOwnedShops([])
        setLoading(false)
        return
      }

      const shopsRef = collection(db, 'shops')
      const ownerQuery = query(shopsRef, where('isActive', '==', true))
      const shopsSnapshot = await getDocs(ownerQuery)
 
      const shopsList: Shop[] = []
      shopsSnapshot.forEach((doc) => {
        if (adminShopIds.includes(doc.id)) {
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
        }
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

  const fetchShopCategories = async (shopId: string) => {
    try {
      setLoading(true)
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
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchShopDepartments = async (shopId: string) => {
  try {
    const departmentsRef = collection(db, "departments")
    const departmentsQuery = query(
      departmentsRef,
      where("shopId", "==", shopId),
      orderBy("order", "asc") // requires composite index!
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
    setError("Failed to load departments. Please try again.")
  }
}


  const fetchShopStats = async (shopId: string) => {
    try {
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
    }
  }

  const handleShopSelect = async (shop: Shop) => {
    setSelectedShop(shop)
    setActiveTab('products')
    setError(null)
    await fetchShopData(shop.id)
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

  const handleDeleteShop = async (shopId: string) => {
    try {
      setError(null)
      
      // Delete the shop document
      const shopRef = doc(db, 'shops', shopId)
      await deleteDoc(shopRef)
      
      // If this was the selected shop, clear selection
      if (selectedShop?.id === shopId) {
        setSelectedShop(null)
        setActiveTab('profile')
      }
      
      // Reload user data to refresh shops list
      await loadUserData()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting shop:', error)
      setError('Failed to delete shop. Please try again.')
    }
  }

  const handlePromoteProduct = (product: Product) => {
    setPromotingProduct(product)
    setShowPromotionModal(true)
  }

  const handleShareProduct = (product: Product) => {
    if (!selectedShop) return

    const productLink = shopLinkUtils.generateShopLink(product.shopId, { productId: product.id })
    const shareMessage = shopLinkUtils.generateProductShareMessage(product, selectedShop, {})

    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(productLink)}&text=${encodeURIComponent(shareMessage)}`
      )
    } else if (navigator.share) {
      navigator.share({
        title: product.name,
        text: shareMessage,
        url: productLink
      }).catch((error) => {
        console.error('Error sharing:', error)
        copyToClipboard(shareMessage)
      })
    } else {
      copyToClipboard(shareMessage)
    }
  }

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Product link copied to clipboard!')
        } else {
          alert('Product link copied to clipboard!')
        }
      }).catch((error) => {
        console.error('Error copying to clipboard:', error)
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Failed to copy link')
        }
      })
    }
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

      const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
      const productLink = `https://t.me/${botUsername}?startapp=${product.shopId}_product_${product.id}`

      const message = `
🔥 <b>${promotionTitle}</b>${discountText}

🛍️ <b>${product.name}</b>

${customMessage || product.description}

💰 <b>Price:</b> ${originalPrice}${discountedPrice}
📦 <b>Available:</b> ${product.stock} in stock
${product.sku ? `🏷️ <b>SKU:</b> ${product.sku}` : ''}${validUntilText}

🛒 <b>Order Now!</b> Don't miss this amazing deal!${tagsText}

👉 <a href="${productLink}">View Product</a>

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

      // Validate target departments
      if (targetDepartments.length === 0) {
        throw new Error('No departments selected or configured. Please select at least one department or configure active departments with Telegram chat IDs.')
      }

      // Validate departments have chat IDs
      const invalidDepartments = targetDepartments.filter(d => !d.telegramChatId)
      if (invalidDepartments.length > 0) {
        throw new Error(`Some departments don't have Telegram chat IDs configured: ${invalidDepartments.map(d => d.name).join(', ')}`)
      }

      console.log('Sending promotion to departments:', targetDepartments.map(d => ({ name: d.name, chatId: d.telegramChatId })))

      // Send or schedule promotion
      const results = []
      for (const department of targetDepartments) {
        try {
          const config = {
            botToken,
            chatId: department.telegramChatId
          }

          console.log(`Sending to ${department.name} (${department.telegramChatId})...`)

          if (isScheduled && scheduledDate) {
            await telegramService.scheduleMessage(config, promotionMessage, scheduledDate)
            results.push({ department: department.name, success: true, scheduled: true })
          } else {
            await telegramService.sendPromotionMessage(config, promotionMessage)
            results.push({ department: department.name, success: true })
          }
          console.log(`✓ Sent to ${department.name}`)
        } catch (deptError: any) {
          console.error(`Failed to send to ${department.name}:`, deptError)
          results.push({ department: department.name, success: false, error: deptError.message })
        }
      }

      // Check if any succeeded
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      console.log('Promotion results:', results)

      if (successCount === 0) {
        throw new Error(`Failed to send to all departments. ${results.map(r => `${r.department}: ${r.error}`).join('; ')}`)
      } else if (failCount > 0) {
        setError(`Sent to ${successCount} department(s), but failed for ${failCount}: ${results.filter(r => !r.success).map(r => r.department).join(', ')}`)
      }

      setShowPromotionModal(false)
      setPromotingProduct(null)
    } catch (error: any) {
      console.error('Error promoting product:', error)
      const errorMessage = error.message || 'Failed to promote product. Please check your Telegram bot configuration.'
      setError(errorMessage)
      throw error
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
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-telegram-bg z-10 px-4 py-3 border-b border-telegram-hint/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-telegram-text">Admin Panel</h1>
            <p className="text-xs text-telegram-hint">{userData.displayName || userData.email}</p>
          </div>
          {selectedShop && (
            <button
              onClick={() => setSelectedShop(null)}
              className="p-2 text-telegram-button rounded-full hover:bg-telegram-button/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

        {/* User Profile Section - Show for all users */}
        {!selectedShop && (
          <div className="bg-telegram-secondary-bg rounded-2xl p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-telegram-button to-telegram-button/70 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-telegram-text truncate">
                  {userData.displayName || 'User'}
                </h2>
                <p className="text-sm text-telegram-hint truncate">{userData.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-1 bg-telegram-button/10 text-telegram-button rounded-full capitalize font-medium">
                    {userData.role}
                  </span>
                  <span className="text-xs text-telegram-hint">{ownedShops.length} shop{ownedShops.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shops List - Only show if user has shops */}
        {ownedShops.length > 0 && !selectedShop && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-telegram-text">Your Shops</h2>
              <button
                onClick={() => setShowCreateShop(true)}
                className="bg-telegram-button text-telegram-button-text px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-3">
              {ownedShops.map((shop) => (
                <div
                  key={shop.id}
                  onClick={() => handleShopSelect(shop)}
                  className="bg-telegram-secondary-bg rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {shop.logo ? (
                        <img src={shop.logo} alt={shop.name} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 bg-telegram-button/10 rounded-xl flex items-center justify-center">
                          <Store className="w-7 h-7 text-telegram-button" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-telegram-text truncate">{shop.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          shop.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {shop.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-telegram-hint line-clamp-2 mb-3">{shop.description}</p>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-telegram-hint">
                          <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="font-medium text-telegram-text">{shop.stats?.totalProducts || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-telegram-hint">
                          <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="w-3.5 h-3.5 text-green-600" />
                          </div>
                          <span className="font-medium text-telegram-text">{shop.stats?.totalOrders || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-telegram-hint">
                          <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <span className="font-medium text-telegram-text">{shop.stats?.totalCustomers || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingShop(shop)
                        }}
                        className="p-2 text-telegram-hint hover:text-telegram-button hover:bg-telegram-button/10 rounded-lg transition-colors"
                        title="Edit Shop"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteConfirm(shop.id)
                        }}
                        className="p-2 text-telegram-hint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Shop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Shops Message */}
        {ownedShops.length === 0 && !showRoleUpgrade && !selectedShop && (
          <div className="text-center py-12 px-4">
            <div className="w-20 h-20 bg-telegram-button/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-telegram-button" />
            </div>
            <h3 className="text-lg font-bold text-telegram-text mb-2">No Shops Yet</h3>
            <p className="text-sm text-telegram-hint mb-6 max-w-xs mx-auto">
              {userData.role === 'customer'
                ? 'Upgrade to shop owner to create and manage your own shops.'
                : 'You don\'t own any shops yet. Create your first shop to get started.'
              }
            </p>
            <button
              onClick={() => userData.role === 'customer' ? setShowRoleUpgrade(true) : setShowCreateShop(true)}
              className="bg-telegram-button text-telegram-button-text px-6 py-3 rounded-full text-sm font-medium active:scale-95 transition-transform shadow-sm"
            >
              {userData.role === 'customer' ? 'Become a Shop Owner' : 'Create Your First Shop'}
            </button>
          </div>
        )}

      {/* User Registration for Role Upgrade */}
      {showRoleUpgrade && userData.role === 'customer' && user && (
        <UserRegistration
          user={user}
          existingUserData={userData}
          onCancel={() => setShowRoleUpgrade(false)}
          onComplete={async () => {
            await loadUserData()
            setShowRoleUpgrade(false)
            setShowCreateShop(true)
          }}
        />
      )}

        {/* Shop Management - Only show if a shop is selected */}
        {selectedShop && (
          <div>
            {/* Shop Header */}
            <div className="bg-telegram-secondary-bg rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                {selectedShop.logo ? (
                  <img src={selectedShop.logo} alt={selectedShop.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-telegram-button/10 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-telegram-button" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-telegram-text truncate">{selectedShop.name}</h2>
                  <p className="text-xs text-telegram-hint">Manage your shop</p>
                </div>
              </div>
            </div>

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-telegram-text">Products</h3>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-telegram-button text-telegram-button-text px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
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
                    onShare={handleShareProduct}
                  />
                ))}
              </div>

                {products.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-telegram-button/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Package className="w-10 h-10 text-telegram-button" />
                    </div>
                    <h3 className="text-lg font-bold text-telegram-text mb-2">No Products Yet</h3>
                    <p className="text-sm text-telegram-hint mb-6">Add your first product to get started.</p>
                    <button
                      onClick={() => setShowAddProduct(true)}
                      className="bg-telegram-button text-telegram-button-text px-6 py-3 rounded-full text-sm font-medium active:scale-95 transition-transform shadow-sm"
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
                  <h3 className="text-lg font-bold text-telegram-text">Categories</h3>
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="bg-telegram-button text-telegram-button-text px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
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
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-telegram-button/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Tag className="w-10 h-10 text-telegram-button" />
                    </div>
                    <h3 className="text-lg font-bold text-telegram-text mb-2">No Categories Yet</h3>
                    <p className="text-sm text-telegram-hint mb-6">Add categories to organize your products.</p>
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="bg-telegram-button text-telegram-button-text px-6 py-3 rounded-full text-sm font-medium active:scale-95 transition-transform shadow-sm"
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
                  <h3 className="text-lg font-bold text-telegram-text">Departments</h3>
                  <button
                    onClick={() => setShowAddDepartment(true)}
                    className="bg-telegram-button text-telegram-button-text px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
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
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-telegram-button/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-telegram-button" />
                    </div>
                    <h3 className="text-lg font-bold text-telegram-text mb-2">No Departments Yet</h3>
                    <p className="text-sm text-telegram-hint mb-6">Add departments for Telegram notifications.</p>
                    <button
                      onClick={() => setShowAddDepartment(true)}
                      className="bg-telegram-button text-telegram-button-text px-6 py-3 rounded-full text-sm font-medium active:scale-95 transition-transform shadow-sm"
                    >
                      Add Department
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <CustomerManagement selectedShopId={selectedShop.id} />
          )}

          {/* CRM Tab */}
          {activeTab === 'crm' && (
            <CRMPanel
              shopId={selectedShop.id}
              shop={selectedShop}
              botToken={botToken}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab shop={selectedShop} stats={stats} />
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <OrderManagement selectedShopId={selectedShop.id} />
          )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-telegram-text">Shop Settings</h3>

              {userData && (
                <TelegramBotSettings
                  userId={userData.uid}
                  onTokenUpdate={(token) => setBotToken(token)}
                />
                )}
              </div>
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
          botToken={botToken}
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

      {/* Promotion Modal */}
      {showPromotionModal && promotingProduct && (
        <PromotionModal
          product={promotingProduct}
          departments={departments}
          botToken={botToken}
          onClose={() => {
            setShowPromotionModal(false)
            setPromotingProduct(null)
          }}
          onPromote={handlePromotionSubmit}
        />
      )}

      {/* Shop Create Modal */}
      {showCreateShop && userData && (
        <ShopCreateModal
          userId={userData.uid}
          onSave={async (shopData) => {
            try {
              setError(null)
              const shopsRef = collection(db, 'shops')
              const shopDoc = await addDoc(shopsRef, {
                ...shopData,
                createdAt: new Date(),
                updatedAt: new Date()
              })

              const shopCustomersRef = collection(db, 'shop_customers')
              await addDoc(shopCustomersRef, {
                customerId: userData.uid,
                telegramId: userData.telegramId || userData.telegram_id,
                shopId: shopDoc.id,
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
              })

              setShowCreateShop(false)
              await loadUserData()
            } catch (error) {
              console.error('Error creating shop:', error)
              setError('Failed to create shop. Please try again.')
            }
          }}
          onCancel={() => setShowCreateShop(false)}
        />
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-telegram-text">Delete Shop</h3>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="text-telegram-hint"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-telegram-text mb-2">
                Are you sure you want to delete this shop? This action cannot be undone.
              </p>
              <p className="text-sm text-red-600">
                All products, categories, departments, and orders associated with this shop will be permanently deleted.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-telegram-hint text-white py-3 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteShop(showDeleteConfirm)}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium"
              >
                Delete Shop
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Bottom Navigation - Mobile First */}
      {selectedShop && (
        <div className="fixed bottom-0 left-0 right-0 bg-telegram-bg border-t border-telegram-hint/10 safe-area-inset-bottom z-20">
          <div className="grid grid-cols-4 gap-1 p-2">
            {[
              { id: 'products', label: 'Products', icon: Package },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'customers', label: 'Customers', icon: User },
              { id: 'crm', label: 'CRM', icon: MessageCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-telegram-button/10 text-telegram-button'
                    : 'text-telegram-hint'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 px-2 pb-2">
            {[
              { id: 'categories', label: 'Categories', icon: Tag },
              { id: 'departments', label: 'Departments', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-telegram-button/10 text-telegram-button'
                    : 'text-telegram-hint'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 

export default AdminPanel