import React, { useEffect, useState } from 'react'
import { useTelegram } from '../contexts/TelegramContext'
import { useFirebase } from '../contexts/FirebaseContext'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { Shop, Product, Category, Department, UserData } from '../types'
import { telegramService } from '../services/telegram'
import { Store, Plus, FileEdit as Edit, Trash2, Save, X, Package, DollarSign, Image, FileText, Star, MapPin, Phone, Clock, Users, BarChart3, Bell, ShoppingCart, Tag, User } from 'lucide-react'

// Simple IndexedDB wrapper for AdminPanel caching (same as ShopList)
class AdminPanelCache {
  private dbName = 'AdminPanelCache'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create stores
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('shops')) {
          db.createObjectStore('shops', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('departments')) {
          db.createObjectStore('departments', { keyPath: 'id' })
        }
      }
    })
  }

  async getUserData(userId: string): Promise<UserData | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly')
      const store = transaction.objectStore('users')
      const request = store.get(userId)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async setUserData(userId: string, userData: UserData): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite')
      const store = transaction.objectStore('users')
      const request = store.put({ id: userId, ...userData })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getShops(): Promise<Shop[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shops'], 'readonly')
      const store = transaction.objectStore('shops')
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async setShops(shops: Shop[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shops'], 'readwrite')
      const store = transaction.objectStore('shops')
      
      // Clear existing data
      store.clear()
      
      // Add new data
      shops.forEach(shop => store.add(shop))
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getProducts(shopId: string): Promise<Product[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readonly')
      const store = transaction.objectStore('products')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allProducts = request.result || []
        const shopProducts = allProducts.filter((p: Product) => p.shopId === shopId)
        resolve(shopProducts)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setProducts(shopId: string, products: Product[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite')
      const store = transaction.objectStore('products')
      
      // Remove existing products for this shop
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => {
        const allProducts = getAllRequest.result || []
        const otherShopProducts = allProducts.filter((p: Product) => p.shopId !== shopId)
        
        // Clear and re-add
        store.clear()
        otherShopProducts.forEach(product => store.add(product))
        products.forEach(product => store.add(product))
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }

  async getCategories(shopId: string): Promise<Category[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readonly')
      const store = transaction.objectStore('categories')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allCategories = request.result || []
        const shopCategories = allCategories.filter((c: Category) => c.shopId === shopId)
        resolve(shopCategories)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setCategories(shopId: string, categories: Category[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite')
      const store = transaction.objectStore('categories')
      
      // Remove existing categories for this shop
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => {
        const allCategories = getAllRequest.result || []
        const otherShopCategories = allCategories.filter((c: Category) => c.shopId !== shopId)
        
        // Clear and re-add
        store.clear()
        otherShopCategories.forEach(category => store.add(category))
        categories.forEach(category => store.add(category))
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }

  async getDepartments(shopId: string): Promise<Department[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['departments'], 'readonly')
      const store = transaction.objectStore('departments')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allDepartments = request.result || []
        const shopDepartments = allDepartments.filter((d: Department) => d.shopId === shopId)
        resolve(shopDepartments)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async setDepartments(shopId: string, departments: Department[]): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['departments'], 'readwrite')
      const store = transaction.objectStore('departments')
      
      // Remove existing departments for this shop
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => {
        const allDepartments = getAllRequest.result || []
        const otherShopDepartments = allDepartments.filter((d: Department) => d.shopId !== shopId)
        
        // Clear and re-add
        store.clear()
        otherShopDepartments.forEach(department => store.add(department))
        departments.forEach(department => store.add(department))
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }

  async addProduct(product: Product): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite')
      const store = transaction.objectStore('products')
      const request = store.put(product)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async updateProduct(product: Product): Promise<void> {
    return this.addProduct(product) // Same operation in IndexedDB
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['products'], 'readwrite')
      const store = transaction.objectStore('products')
      const request = store.delete(productId)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async addCategory(category: Category): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite')
      const store = transaction.objectStore('categories')
      const request = store.put(category)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite')
      const store = transaction.objectStore('categories')
      const request = store.delete(categoryId)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async addDepartment(department: Department): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['departments'], 'readwrite')
      const store = transaction.objectStore('departments')
      const request = store.put(department)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteDepartment(departmentId: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['departments'], 'readwrite')
      const store = transaction.objectStore('departments')
      const request = store.delete(departmentId)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

const adminPanelCache = new AdminPanelCache()

const AdminPanel: React.FC = () => {
  const { user } = useTelegram()
  const { db } = useFirebase()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [loading, setLoading] = useState(true)
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
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [promotingProduct, setPromotingProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync when coming back online
      if (user?.id) {
        loadUserData()
      }
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initialize cache
    adminPanelCache.init().catch(console.error)
    
    if (user?.id) {
      loadUserData()
    } else {
      setLoading(false)
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user])

  const loadUserData = async () => {
    try {
      setUserLoading(true)
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        setError('No user information available')
        return
      }

      console.log('Loading user data for:', user.id)
      
      // Load user data from cache first (fast)
      const cachedUserData = await adminPanelCache.getUserData(user.id)
      if (cachedUserData) {
        console.log('Found cached user data:', cachedUserData)
        setUserData(cachedUserData)
        setUserLoading(false)
      }
      
      // Load shops from cache first (fast)
      const cachedShops = await adminPanelCache.getShops()
      if (cachedShops.length > 0) {
        const userShops = cachedShops.filter(shop => shop.ownerId === user.id)
        console.log('Found cached shops:', userShops.length)
        setOwnedShops(userShops)
      }
      
      // If online, sync with Firebase in background
      if (isOnline) {
        console.log('Online: Syncing with Firebase...')
        try {
          // Query users collection by telegramId
          const usersRef = collection(db, 'users')
          const userQuery = query(usersRef, where('telegram_id', '==', parseInt(user.id)))
          const userSnapshot = await getDocs(userQuery)
          
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0]
            const userData = userDoc.data() as UserData
            setUserData(userData)
            await adminPanelCache.setUserData(user.id, userData)
          }
          
          // Fetch all active shops for browsing
          const shopsRef = collection(db, 'shops')
          const shopsQuery = query(
            shopsRef, 
            where('isActive', '==', true),
            orderBy('updatedAt', 'desc')
          )
          const shopsSnapshot = await getDocs(shopsQuery)
          
          const allShops: Shop[] = []
          shopsSnapshot.forEach((doc) => {
            const data = doc.data()
            const shop: Shop = {
              id: doc.id,
              ownerId: data.ownerId,
              name: data.name,
              slug: data.slug,
              description: data.description,
              logo: data.logo,
              isActive: data.isActive,
              businessInfo: data.businessInfo,
              settings: data.settings,
              stats: data.stats,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            }
            allShops.push(shop)
          })
          
          await adminPanelCache.setShops(allShops)
          const userShops = allShops.filter(shop => shop.ownerId === user.id)
          setOwnedShops(userShops)
          
          console.log('Firebase sync completed')
        } catch (syncError) {
          console.warn('Firebase sync failed, using cached data:', syncError)
        }
      } else {
        console.log('Offline: Using cached data only')
      }
      
    } catch (error) {
      console.error('Error loading user data:', error)
      setError('Failed to load user data. Please try again.')
    } finally {
      setLoading(false)
      setUserLoading(false)
    }
  }

  const fetchShopData = async (shopId: string) => {
    console.log('Fetching shop data for:', shopId)
    await Promise.all([
      fetchShopProducts(shopId),
      fetchShopCategories(shopId),
      fetchShopDepartments(shopId),
      fetchShopStats(shopId)
    ])
  }

  const fetchShopProducts = async (shopId: string) => {
    try {
      console.log('Fetching products for shop:', shopId)
      
      // Load from cache first (fast)
      if (!isOnline) {
        console.log('Offline: Loading products from cache')
        const cachedProducts = await adminPanelCache.getProducts(shopId)
        if (cachedProducts.length > 0) {
          setProducts(cachedProducts)
          return
        }
      }
      
      const cachedProducts = await adminPanelCache.getProducts(shopId)
      console.log('Found cached products:', cachedProducts.length)
      setProducts(cachedProducts)
      
      // If online, sync in background
      if (isOnline) {
        try {
          const productsRef = collection(db, 'products')
          const productsQuery = query(
            productsRef, 
            where('shopId', '==', shopId),
            where('isActive', '==', true),
            orderBy('name', 'asc')
          )
          const productsSnapshot = await getDocs(productsQuery)
          
          const productsList: Product[] = []
          productsSnapshot.forEach((doc) => {
            const data = doc.data()
            const product: Product = {
              id: doc.id,
              shopId: data.shopId,
              name: data.name || 'Unnamed Product',
              description: data.description || 'No description available',
              price: data.price || 0,
              stock: data.stock || 0,
              category: data.category || 'other',
              subcategory: data.subcategory,
              images: data.images || [],
              sku: data.sku,
              isActive: data.isActive !== false,
              lowStockAlert: data.lowStockAlert || 0,
              tags: data.tags,
              featured: data.featured,
              costPrice: data.costPrice,
              weight: data.weight,
              dimensions: data.dimensions,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            }
            productsList.push(product)
          })

          setProducts(productsList)
          await adminPanelCache.setProducts(shopId, productsList)
        } catch (syncError) {
          console.warn('Product sync failed, using cached data:', syncError)
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setError('Failed to load products. Please try again.')
    }
  }

  const fetchShopCategories = async (shopId: string) => {
    try {
      console.log('Fetching categories for shop:', shopId)
      
      // Load from cache first (fast)
      if (!isOnline) {
        console.log('Offline: Loading categories from cache')
        const cachedCategories = await adminPanelCache.getCategories(shopId)
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories)
          return
        }
      }
      
      const cachedCategories = await adminPanelCache.getCategories(shopId)
      console.log('Found cached categories:', cachedCategories.length)
      setCategories(cachedCategories)
      
      // If online, sync in background
      if (isOnline) {
        try {
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
              image: data.image,
              color: data.color,
              icon: data.icon,
              order: data.order,
              isActive: data.isActive,
              productCount: data.productCount,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            }
            categoriesList.push(category)
          })

          setCategories(categoriesList)
          await adminPanelCache.setCategories(shopId, categoriesList)
        } catch (syncError) {
          console.warn('Category sync failed, using cached data:', syncError)
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories. Please try again.')
    }
  }

  const fetchShopDepartments = async (shopId: string) => {
    try {
      console.log('Fetching departments for shop:', shopId)
      
      // Load from cache first (fast)
      if (!isOnline) {
        console.log('Offline: Loading departments from cache')
        const cachedDepartments = await adminPanelCache.getDepartments(shopId)
        if (cachedDepartments.length > 0) {
          setDepartments(cachedDepartments)
          return
        }
      }
      
      const cachedDepartments = await adminPanelCache.getDepartments(shopId)
      console.log('Found cached departments:', cachedDepartments.length)
      setDepartments(cachedDepartments)
      
      // If online, sync in background
      if (isOnline) {
        try {
          const departmentsRef = collection(db, 'departments')
          const departmentsQuery = query(
            departmentsRef, 
            where('shopId', '==', shopId),
            orderBy('order', 'asc')
          )
          const departmentsSnapshot = await getDocs(departmentsQuery)
          
          const departmentsList: Department[] = []
          departmentsSnapshot.forEach((doc) => {
            const data = doc.data()
            const department: Department = {
              id: doc.id,
              userId: data.userId,
              shopId: data.shopId,
              name: data.name,
              telegramChatId: data.telegramChatId,
              adminChatId: data.adminChatId,
              role: data.role,
              order: data.order,
              icon: data.icon,
              isActive: data.isActive,
              notificationTypes: data.notificationTypes,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            }
            departmentsList.push(department)
          })

          setDepartments(departmentsList)
          await adminPanelCache.setDepartments(shopId, departmentsList)
        } catch (syncError) {
          console.warn('Department sync failed, using cached data:', syncError)
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments. Please try again.')
    }
  }


  const fetchShopStats = async (shopId: string) => {
    try {
      console.log('Fetching stats for shop:', shopId)
      
      // Get product count
      const cachedProducts = await adminPanelCache.getProducts(shopId)
      const totalProducts = cachedProducts.filter(p => p.isActive).length
      
      // For now, we'll use mock data for orders since we don't have order caching yet
      // In a real implementation, you'd want to add order caching too
      const totalOrders = Math.floor(Math.random() * 100)
      const totalRevenue = Math.floor(Math.random() * 10000)
      const totalCustomers = Math.floor(Math.random() * 50)

      console.log('Calculated stats:', { totalProducts, totalOrders, totalRevenue, totalCustomers })
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
    console.log('Selecting shop:', shop.name)
    setSelectedShop(shop)
    setActiveTab('products')
    setError(null)
    await fetchShopData(shop.id)
  }

  const handleSaveProduct = async (productData: any) => {
    try {
      setError(null)
      console.log('Saving product:', productData.name)
      
      if (editingProduct) {
        // Update existing product
        const updatedProduct = {
          ...editingProduct,
          ...productData,
          updatedAt: new Date()
        }
        await adminPanelCache.updateProduct(updatedProduct)
        console.log('Product updated:', editingProduct.id)
      } else {
        // Add new product
        const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newProduct = {
          id: productId,
          ...productData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await adminPanelCache.addProduct(newProduct)
        console.log('Product created:', productId)
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
      console.log('Deleting product:', productId)
      await adminPanelCache.deleteProduct(productId)
      
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
      console.log('Saving category:', categoryData.name)
      
      if (editingCategory) {
        // Update existing category
        const updatedCategory = {
          ...editingCategory,
          ...categoryData,
          updatedAt: new Date()
        }
        await adminPanelCache.addCategory(updatedCategory)
      } else {
        // Add new category
        const categoryId = `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newCategory = {
          id: categoryId,
          ...categoryData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await adminPanelCache.addCategory(newCategory)
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
      console.log('Deleting category:', categoryId)
      await adminPanelCache.deleteCategory(categoryId)
      
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
      console.log('Saving department:', departmentData.name)
      
      if (editingDepartment) {
        // Update existing department
        const updatedDepartment = {
          ...editingDepartment,
          ...departmentData,
          updatedAt: new Date()
        }
        await adminPanelCache.addDepartment(updatedDepartment)
      } else {
        // Add new department
        const departmentId = `department_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newDepartment = {
          id: departmentId,
          ...departmentData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await adminPanelCache.addDepartment(newDepartment)
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
      console.log('Deleting department:', departmentId)
      await adminPanelCache.deleteDepartment(departmentId)
      
      if (selectedShop) {
        await fetchShopDepartments(selectedShop.id)
      }
    } catch (error) {
      console.error('Error deleting department:', error)
      setError('Failed to delete department. Please try again.')
    }
  }

  const handlePromoteProduct = (product: Product) => {
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

  if (userLoading || loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-16 bg-gray-300 rounded"></div>
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
          {!isOnline && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-lg mb-4 text-sm">
              You're offline. Some data may be outdated.
            </div>
          )}
          <button
            onClick={loadUserData}
            className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-telegram-text">Admin Panel</h1>
        <div className="text-xs text-telegram-hint">
          {userData.displayName || userData.email}
          {!isOnline && ' (Offline)'}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!isOnline && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Offline mode - Using cached data</span>
          </div>
        </div>
      )}
      {/* User Profile Section - Show for all users */}
      <div className="bg-telegram-secondary-bg rounded-lg p-3">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-telegram-button rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-telegram-text">
              {userData.displayName || 'User'}
            </h2>
            <p className="text-sm text-telegram-hint">{userData.email}</p>
            <p className="text-sm text-telegram-hint capitalize">Role: {userData.role}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-telegram-hint">Shops</div>
            <div className="text-lg font-bold text-telegram-button">
              {ownedShops.length}
            </div>
          </div>
        </div>
      </div>

      {/* Shops List - Only show if user has shops */}
      {ownedShops.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-telegram-text">Your Shops</h2>
          
          {ownedShops.map((shop) => (
            <div key={shop.id} className="bg-telegram-secondary-bg rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {shop.logo && (
                      <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-telegram-text">{shop.name}</h3>
                      <p className="text-xs text-telegram-hint mt-1 line-clamp-2">{shop.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 mt-2 text-xs text-telegram-hint">
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
                
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => setEditingShop(shop)}
                    className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded-lg"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleShopSelect(shop)}
                    className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded-lg"
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Shops Message */}
      {ownedShops.length === 0 && (
        <div className="text-center py-6">
          <Store className="w-12 h-12 mx-auto text-telegram-hint mb-3" />
          <h3 className="text-base font-medium text-telegram-text mb-2">No Shops Yet</h3>
          <p className="text-sm text-telegram-hint mb-4">
            You don't own any shops yet. Contact an administrator to get started.
          </p>
          <button
            onClick={() => setActiveTab('profile')}
            className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm"
          >
            View Profile
          </button>
        </div>
      )}

      {/* Shop Management - Only show if a shop is selected */}
      {selectedShop && (
        <div className="space-y-4">
          {/* Shop Header */}
          <div className="flex items-center justify-between">
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

      {/* Profile Tab for all users */}
      {!selectedShop && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-telegram-text">User Profile</h2>
          <div className="bg-telegram-secondary-bg rounded-lg p-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-telegram-text mb-1">Display Name</label>
                <div className="p-2 bg-telegram-bg rounded-lg text-telegram-text text-sm">
                  {userData.displayName || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-telegram-text mb-1">Email</label>
                <div className="p-2 bg-telegram-bg rounded-lg text-telegram-text text-sm">
                  {userData.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-telegram-text mb-1">Role</label>
                <div className="p-2 bg-telegram-bg rounded-lg text-telegram-text capitalize text-sm">
                  {userData.role}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-telegram-text mb-1">User ID</label>
                <div className="p-2 bg-telegram-bg rounded-lg text-telegram-text font-mono text-xs">
                  {userData.uid}
                </div>
              </div>
            </div>
            
            {userData.businessInfo && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-telegram-text mb-2">Business Information</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-telegram-text mb-1">Business Name</label>
                    <div className="p-2 bg-telegram-bg rounded-lg text-telegram-text text-sm">
                      {userData.businessInfo.name || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-telegram-text mb-1">Phone</label>
                    <div className="p-2 bg-telegram-bg rounded-lg text-telegram-text text-sm">
                      {userData.businessInfo.phone || 'Not set'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              // For now, just update the local state
              // In a real app, you'd want to sync this to Firebase too
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
import AnalyticsTab from './admin/AnalyticsTab'
import { ArrowLeft } from 'lucide-react'

export default AdminPanel