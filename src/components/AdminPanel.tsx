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
import { Store, Plus, Package, Tag, Users, BarChart3 } from 'lucide-react'

// Import the new components
import ShopCard from './admin/ShopCard'
import ShopEditModal from './admin/ShopEditModal'
import ProductCard from './admin/ProductCard'
import ProductEditModal from './admin/ProductEditModal'
import CategoryCard from './admin/CategoryCard'
import CategoryEditModal from './admin/CategoryEditModal'
import DepartmentCard from './admin/DepartmentCard'
import DepartmentEditModal from './admin/DepartmentEditModal'
import AnalyticsTab from './admin/AnalyticsTab'

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
  const [userData, setUserData] = useState<UserData | null>(null)

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
      const userQuery = query(usersRef, where('telegramId', '==', parseInt(user.id)))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        setIsOwner(false)
        setError('User not found in database')
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      setUserData(userData)

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
        slug: updatedShop.slug,
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
      
      setProducts(prev => [product, ...prev])
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
        sku: updatedProduct.sku,
        isActive: updatedProduct.isActive,
        lowStockAlert: updatedProduct.lowStockAlert,
        tags: updatedProduct.tags,
        featured: updatedProduct.featured,
        costPrice: updatedProduct.costPrice,
        weight: updatedProduct.weight,
        dimensions: updatedProduct.dimensions,
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
    if (!confirm('Are you sure you want to delete this product?')) return
    
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

  const handleUpdateCategory = async (updatedCategory: Category) => {
    try {
      const categoryRef = doc(db, 'categories', updatedCategory.id)
      await updateDoc(categoryRef, {
        name: updatedCategory.name,
        description: updatedCategory.description,
        color: updatedCategory.color,
        icon: updatedCategory.icon,
        order: updatedCategory.order,
        isActive: updatedCategory.isActive,
        updatedAt: new Date()
      })
      
      setCategories(prev => prev.map(category => 
        category.id === updatedCategory.id ? updatedCategory : category
      ))
      setEditingCategory(null)
    } catch (error) {
      console.error('Error updating category:', error)
      setError('Failed to update category. Please try again.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      await deleteDoc(doc(db, 'categories', categoryId))
      setCategories(prev => prev.filter(category => category.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      setError('Failed to delete category. Please try again.')
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

  const handleUpdateDepartment = async (updatedDepartment: Department) => {
    try {
      const departmentRef = doc(db, 'departments', updatedDepartment.id)
      await updateDoc(departmentRef, {
        name: updatedDepartment.name,
        telegramChatId: updatedDepartment.telegramChatId,
        adminChatId: updatedDepartment.adminChatId,
        role: updatedDepartment.role,
        order: updatedDepartment.order,
        icon: updatedDepartment.icon,
        isActive: updatedDepartment.isActive,
        notificationTypes: updatedDepartment.notificationTypes,
        updatedAt: new Date()
      })
      
      setDepartments(prev => prev.map(department => 
        department.id === updatedDepartment.id ? updatedDepartment : department
      ))
      setEditingDepartment(null)
    } catch (error) {
      console.error('Error updating department:', error)
      setError('Failed to update department. Please try again.')
    }
  }

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    
    try {
      await deleteDoc(doc(db, 'departments', departmentId))
      setDepartments(prev => prev.filter(department => department.id !== departmentId))
    } catch (error) {
      console.error('Error deleting department:', error)
      setError('Failed to delete department. Please try again.')
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
          <ShopCard
            key={shop.id}
            shop={shop}
            onEdit={setEditingShop}
            onSelect={handleShopSelect}
          />
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
                  {selectedShop.settings?.currency === 'ETB' ? 'Br' : '$'}{stats?.totalRevenue?.toFixed(2) || '0.00'}
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

              <div className="grid gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={setEditingProduct}
                    onDelete={handleDeleteProduct}
                  />
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
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={setEditingCategory}
                    onDelete={handleDeleteCategory}
                  />
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
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    onEdit={setEditingDepartment}
                    onDelete={handleDeleteDepartment}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab shop={selectedShop} stats={stats} />
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

      {showAddCategory && selectedShop && userData && (
        <CategoryEditModal
          userId={userData.uid}
          shopId={selectedShop.id}
          onSave={handleAddCategory}
          onCancel={() => setShowAddCategory(false)}
        />
      )}

      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          userId={editingCategory.userId}
          shopId={editingCategory.shopId}
          onSave={handleUpdateCategory}
          onCancel={() => setEditingCategory(null)}
        />
      )}

      {showAddDepartment && selectedShop && userData && (
        <DepartmentEditModal
          userId={userData.uid}
          shopId={selectedShop.id}
          onSave={handleAddDepartment}
          onCancel={() => setShowAddDepartment(false)}
        />
      )}

      {editingDepartment && (
        <DepartmentEditModal
          department={editingDepartment}
          userId={editingDepartment.userId}
          shopId={editingDepartment.shopId || ''}
          onSave={handleUpdateDepartment}
          onCancel={() => setEditingDepartment(null)}
        />
      )}
    </div>
  )
}

export default AdminPanel