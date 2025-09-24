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
import { Shop, Product, Category, Department } from '../types'
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
  Tag
} from 'lucide-react'

const AdminPanel: React.FC = () => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
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
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (user?.id) {
      checkOwnerRole()
    } else {
      setLoading(false)
    }
  }, [user])

  const checkOwnerRole = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        setError('No user information available')
        return
      }

      // Get user document from Firebase using Telegram ID
      const usersRef = collection(db, 'users')
      const userQuery = query(usersRef, where('telegramId', '==', user.id.toString()))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        setIsOwner(false)
        setError('User not found in database')
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data()

      // Check if user has shop_owner role
      if (userData.role !== 'shop_owner' && userData.role !== 'admin') {
        setIsOwner(false)
        setError('You do not have owner permissions')
        return
      }

      setIsOwner(true)
      
      // Find shops owned by this user
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
      console.error('Error checking owner role:', error)
      setError('Failed to verify permissions. Please try again.')
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
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchShopDepartments = async (shopId: string) => {
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
          order: data.order || 0,
          icon: data.icon || '👥',
          isActive: data.isActive !== false,
          notificationTypes: data.notificationTypes || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        departmentsList.push(department)
      })

      setDepartments(departmentsList)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchShopStats = async (shopId: string) => {
    try {
      const shopRef = doc(db, 'shops', shopId)
      const shopDoc = await getDoc(shopRef)
      if (shopDoc.exists()) {
        setStats(shopDoc.data().stats || {})
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop)
    setActiveTab('products')
    fetchShopData(shop.id)
  }

  const handleUpdateShop = async (updatedShop: Shop) => {
    try {
      const shopRef = doc(db, 'shops', updatedShop.id)
      await updateDoc(shopRef, {
        name: updatedShop.name,
        description: updatedShop.description,
        logo: updatedShop.logo,
        isActive: updatedShop.isActive,
        businessInfo: updatedShop.businessInfo,
        settings: updatedShop.settings,
        updatedAt: new Date()
      })
      
      setOwnedShops(shops => shops.map(shop => 
        shop.id === updatedShop.id ? updatedShop : shop
      ))
      if (selectedShop?.id === updatedShop.id) {
        setSelectedShop(updatedShop)
      }
      setEditingShop(null)
    } catch (error) {
      console.error('Error updating shop:', error)
      setError('Failed to update shop. Please try again.')
    }
  }

  const handleAddProduct = async (newProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const productsRef = collection(db, 'products')
      const docRef = await addDoc(productsRef, {
        ...newProduct,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      const product: Product = {
        ...newProduct,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setProducts(prev => [...prev, product])
      setShowAddProduct(false)
      
      // Update shop stats
      if (selectedShop) {
        await updateShopStats(selectedShop.id, 'products')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      setError('Failed to add product. Please try again.')
    }
  }

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const productRef = doc(db, 'products', updatedProduct.id)
      await updateDoc(productRef, {
        name: updatedProduct.name,
        description: updatedProduct.description,
        price: updatedProduct.price,
        stock: updatedProduct.stock,
        category: updatedProduct.category,
        subcategory: updatedProduct.subcategory,
        images: updatedProduct.images,
        isActive: updatedProduct.isActive,
        lowStockAlert: updatedProduct.lowStockAlert,
        tags: updatedProduct.tags,
        featured: updatedProduct.featured,
        updatedAt: new Date()
      })
      
      setProducts(prev => prev.map(product => 
        product.id === updatedProduct.id ? updatedProduct : product
      ))
      setEditingProduct(null)
    } catch (error) {
      console.error('Error updating product:', error)
      setError('Failed to update product. Please try again.')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId))
      setProducts(prev => prev.filter(product => product.id !== productId))
      
      // Update shop stats
      if (selectedShop) {
        await updateShopStats(selectedShop.id, 'products')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      setError('Failed to delete product. Please try again.')
    }
  }

  const handleAddCategory = async (newCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const categoriesRef = collection(db, 'categories')
      const docRef = await addDoc(categoriesRef, {
        ...newCategory,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      const category: Category = {
        ...newCategory,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setCategories(prev => [...prev, category])
      setShowAddCategory(false)
    } catch (error) {
      console.error('Error adding category:', error)
      setError('Failed to add category. Please try again.')
    }
  }

  const handleAddDepartment = async (newDepartment: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const departmentsRef = collection(db, 'departments')
      const docRef = await addDoc(departmentsRef, {
        ...newDepartment,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      const department: Department = {
        ...newDepartment,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setDepartments(prev => [...prev, department])
      setShowAddDepartment(false)
    } catch (error) {
      console.error('Error adding department:', error)
      setError('Failed to add department. Please try again.')
    }
  }

  const updateShopStats = async (shopId: string, type: 'products' | 'orders' | 'revenue' | 'customers') => {
    try {
      const shopRef = doc(db, 'shops', shopId)
      const shopDoc = await getDoc(shopRef)
      
      if (shopDoc.exists()) {
        const currentStats = shopDoc.data().stats || {}
        const newStats = { ...currentStats }
        
        switch (type) {
          case 'products':
            const productsQuery = query(collection(db, 'products'), where('shopId', '==', shopId))
            const productsSnapshot = await getDocs(productsQuery)
            newStats.totalProducts = productsSnapshot.size
            break
        }
        
        await updateDoc(shopRef, { stats: newStats })
        setStats(newStats)
      }
    } catch (error) {
      console.error('Error updating shop stats:', error)
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

  if (!isOwner) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <Store className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">Access Denied</h3>
          <p className="text-telegram-hint">
            {error || 'You do not have owner permissions to access the admin panel.'}
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
          {ownedShops.length} shop{ownedShops.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Shops List */}
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

      {/* Shop Management */}
      {selectedShop && (
        <div className="space-y-6">
          {/* Shop Header */}
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-telegram-text">{selectedShop.name}</h2>
                <p className="text-telegram-hint">{selectedShop.description}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-telegram-hint">Total Revenue</div>
                <div className="text-2xl font-bold text-telegram-button">
                  ${stats?.totalRevenue?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-telegram-secondary-bg rounded-lg p-1">
            {[
              { id: 'products', label: 'Products', icon: Package },
              { id: 'categories', label: 'Categories', icon: Tag },
              { id: 'departments', label: 'Departments', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-telegram-button text-telegram-button-text'
                    : 'text-telegram-hint hover:text-telegram-text'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-telegram-text">Products</h3>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="flex items-center space-x-2 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {products.map((product) => (
                  <div key={product.id} className="bg-telegram-secondary-bg rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {product.images[0] && (
                            <img src={product.images[0]} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                          )}
                          <div>
                            <h4 className="font-medium text-telegram-text">{product.name}</h4>
                            <p className="text-sm text-telegram-hint mt-1 line-clamp-2">{product.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-lg font-bold text-telegram-button">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            Stock: {product.stock}
                          </span>
                          {product.featured && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded"
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

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-telegram-text">Categories</h3>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="flex items-center space-x-2 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div key={category.id} className="bg-telegram-secondary-bg rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: category.color + '20', color: category.color }}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-telegram-text">{category.name}</h4>
                        <p className="text-sm text-telegram-hint">{category.productCount} products</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-telegram-text">Telegram Departments</h3>
                <button
                  onClick={() => setShowAddDepartment(true)}
                  className="flex items-center space-x-2 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {departments.map((department) => (
                  <div key={department.id} className="bg-telegram-secondary-bg rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{department.icon}</div>
                        <div>
                          <h4 className="font-medium text-telegram-text">{department.name}</h4>
                          <p className="text-sm text-telegram-hint capitalize">{department.role}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        department.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {department.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-telegram-text">Shop Analytics</h3>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-telegram-secondary-bg rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Package className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold text-telegram-text">{stats?.totalProducts || 0}</div>
                      <div className="text-sm text-telegram-hint">Total Products</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-telegram-secondary-bg rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="w-8 h-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold text-telegram-text">{stats?.totalOrders || 0}</div>
                      <div className="text-sm text-telegram-hint">Total Orders</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-telegram-secondary-bg rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-8 h-8 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold text-telegram-text">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                      <div className="text-sm text-telegram-hint">Total Revenue</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-telegram-secondary-bg rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-8 h-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold text-telegram-text">{stats?.totalCustomers || 0}</div>
                      <div className="text-sm text-telegram-hint">Total Customers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingShop && (
        <ShopEditModal
          shop={editingShop}
          onSave={handleUpdateShop}
          onCancel={() => setEditingShop(null)}
        />
      )}

      {showAddProduct && selectedShop && (
        <ProductEditModal
          shopId={selectedShop.id}
          categories={categories}
          onSave={handleAddProduct}
          onCancel={() => setShowAddProduct(false)}
        />
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          shopId={editingProduct.shopId}
          categories={categories}
          onSave={handleUpdateProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      {showAddCategory && selectedShop && (
        <CategoryEditModal
          userId={user?.id?.toString() || ''}
          shopId={selectedShop.id}
          onSave={handleAddCategory}
          onCancel={() => setShowAddCategory(false)}
        />
      )}

      {showAddDepartment && selectedShop && (
        <DepartmentEditModal
          userId={user?.id?.toString() || ''}
          shopId={selectedShop.id}
          onSave={handleAddDepartment}
          onCancel={() => setShowAddDepartment(false)}
        />
      )}
    </div>
  )
}

// Updated ShopEditModal to match new schema
interface ShopEditModalProps {
  shop: Shop
  onSave: (shop: Shop) => void
  onCancel: () => void
}

const ShopEditModal: React.FC<ShopEditModalProps> = ({ shop, onSave, onCancel }) => {
  const [formData, setFormData] = useState(shop)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">Edit Shop</h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Store className="w-4 h-4 inline mr-1" />
                Shop Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              <Image className="w-4 h-4 inline mr-1" />
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logo}
              onChange={(e) => setFormData({...formData, logo: e.target.value})}
              className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-telegram-text">
              Shop is active
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-telegram-hint text-telegram-hint rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Updated ProductEditModal to match new schema
interface ProductEditModalProps {
  product?: Product
  shopId: string
  categories: Category[]
  onSave: (product: any) => void
  onCancel: () => void
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, shopId, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    subcategory: product?.subcategory || '',
    images: product?.images || [''],
    sku: product?.sku || '',
    isActive: product?.isActive ?? true,
    lowStockAlert: product?.lowStockAlert || 5,
    tags: product?.tags || [],
    featured: product?.featured || false,
    costPrice: product?.costPrice || 0,
    weight: product?.weight || 0,
    shopId: shopId
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (product) {
      onSave({ ...product, ...formData })
    } else {
      onSave(formData)
    }
  }

  const addImageField = () => {
    setFormData({...formData, images: [...formData.images, '']})
  }

  const updateImage = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData({...formData, images: newImages})
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">
            {product ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Package className="w-4 h-4 inline mr-1" />
                Product Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                Cost Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value)})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                Stock
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">Low Stock Alert</label>
              <input
                type="number"
                min="0"
                value={formData.lowStockAlert}
                onChange={(e) => setFormData({...formData, lowStockAlert: parseInt(e.target.value)})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              <Image className="w-4 h-4 inline mr-1" />
              Image URLs
            </label>
            <div className="space-y-2">
              {formData.images.map((image, index) => (
                <input
                  key={index}
                  type="url"
                  value={image}
                  onChange={(e) => updateImage(index, e.target.value)}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  placeholder={`Image URL ${index + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={addImageField}
                className="text-telegram-button text-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add another image</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm text-telegram-text">
                Active
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="featured" className="text-sm text-telegram-text">
                Featured
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{product ? 'Update' : 'Add'} Product</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-telegram-hint text-telegram-hint rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add CategoryEditModal and DepartmentEditModal components similarly...

export default AdminPanel
