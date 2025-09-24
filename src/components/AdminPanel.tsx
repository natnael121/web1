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
    // Load all shops for now (everyone can see)
    const fetchShops = async () => {
      try {
        setLoading(true)
        const shopsRef = collection(db, 'shops')
        const snapshot = await getDocs(shopsRef)
        const shopsList: Shop[] = []

        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          shopsList.push({
            id: docSnap.id,
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
          })
        })
        setOwnedShops(shopsList)
      } catch (err) {
        console.error('Error fetching shops:', err)
        setError('Failed to load shops')
      } finally {
        setLoading(false)
      }
    }

    fetchShops()
  }, [db])

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
      const productsQuery = query(productsRef, where('shopId', '==', shopId), orderBy('createdAt', 'desc'))
      const productsSnapshot = await getDocs(productsQuery)

      const productsList: Product[] = []
      productsSnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        productsList.push({
          id: docSnap.id,
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
        })
      })
      setProducts(productsList)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Failed to load products.')
    }
  }

  const fetchShopCategories = async (shopId: string) => {
    try {
      const categoriesRef = collection(db, 'categories')
      const categoriesQuery = query(categoriesRef, where('shopId', '==', shopId), orderBy('order', 'asc'))
      const snapshot = await getDocs(categoriesQuery)

      const list: Category[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
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
        })
      })
      setCategories(list)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchShopDepartments = async (shopId: string) => {
    try {
      const ref = collection(db, 'departments')
      const q = query(ref, where('shopId', '==', shopId), orderBy('order', 'asc'))
      const snapshot = await getDocs(q)

      const list: Department[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
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
        })
      })
      setDepartments(list)
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchShopStats = async (shopId: string) => {
    try {
      const ref = doc(db, 'shops', shopId)
      const shopDoc = await getDoc(ref)
      if (shopDoc.exists()) {
        setStats(shopDoc.data().stats || {})
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop)
    setActiveTab('products')
    fetchShopData(shop.id)
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-telegram-text">Admin Panel</h1>
        <div className="text-sm text-telegram-hint">{ownedShops.length} shop(s)</div>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded">{error}</div>}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-telegram-text">All Shops</h2>
        {ownedShops.map((shop) => (
          <ShopCard key={shop.id} shop={shop} onEdit={setEditingShop} onSelect={handleShopSelect} />
        ))}
      </div>

      {selectedShop && (
        <div className="space-y-6">
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <h2 className="text-xl font-bold">{selectedShop.name}</h2>
            <p>{selectedShop.description}</p>
          </div>

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
                className={`flex-1 px-4 py-2 rounded-md ${
                  activeTab === tab.id
                    ? 'bg-telegram-button text-white'
                    : 'text-telegram-hint hover:text-telegram-text'
                }`}
              >
                <tab.icon className="w-4 h-4 inline-block mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'products' && (
            <div>
              <h3 className="text-lg font-semibold">Products</h3>
              <div className="grid gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onEdit={setEditingProduct} onDelete={() => {}} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <h3 className="text-lg font-semibold">Categories</h3>
              <div className="grid gap-4">
                {categories.map((c) => (
                  <CategoryCard key={c.id} category={c} onEdit={setEditingCategory} onDelete={() => {}} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div>
              <h3 className="text-lg font-semibold">Departments</h3>
              <div className="grid gap-4">
                {departments.map((d) => (
                  <DepartmentCard key={d.id} department={d} onEdit={setEditingDepartment} onDelete={() => {}} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && <AnalyticsTab shop={selectedShop} stats={stats} />}
        </div>
      )}
    </div>
  )
}

export default AdminPanel
