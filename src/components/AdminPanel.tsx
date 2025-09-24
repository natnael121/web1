import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop, Product } from '../types'
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
  Clock
} from 'lucide-react'

interface Department {
  id: string
  telegramChatId: string
  role: string
  shopId: string
  userId: string
  name: string
  icon: string
  order: number
  createdAt: Date
  updatedAt: Date
}

const AdminPanel: React.FC = () => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ownedShops, setOwnedShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Check if user has owner role in department collection
      const departmentRef = collection(db, 'department')
      const ownerQuery = query(
        departmentRef, 
        where('telegramChatId', '==', user.id),
        where('role', '==', 'owner')
      )
      const ownerSnapshot = await getDocs(ownerQuery)
      
      if (ownerSnapshot.empty) {
        setIsOwner(false)
        setError('You do not have owner permissions.')
        return
      }

      setIsOwner(true)
      
      // Get shop IDs that user owns
      const shopIds: string[] = []
      ownerSnapshot.forEach((doc) => {
        const data = doc.data() as Department
        if (data.shopId) {
          shopIds.push(data.shopId)
        }
      })

      if (shopIds.length > 0) {
        await fetchOwnedShops(shopIds)
      }
    } catch (error) {
      console.error('Error checking owner role:', error)
      setError('Failed to verify permissions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchOwnedShops = async (shopIds: string[]) => {
    try {
      const shopsPromises = shopIds.map(async (shopId) => {
        const shopDoc = await getDoc(doc(db, 'shops', shopId))
        if (shopDoc.exists()) {
          const data = shopDoc.data()
          const shop: Shop = {
            id: shopDoc.id,
            name: data.name || 'Unnamed Shop',
            description: data.description || 'No description available',
            imageUrl: data.imageUrl || data.image_url || '',
            category: data.category || 'other',
            rating: data.rating || 0,
            isActive: data.isActive !== false,
            address: data.address || '',
            phone: data.phone || '',
            hours: data.hours || data.opening_hours || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          }
          return shop
        }
        return null
      })
      
      const shopsResults = await Promise.all(shopsPromises)
      const validShops = shopsResults.filter((shop): shop is Shop => shop !== null)
      setOwnedShops(validShops)
    } catch (error) {
      console.error('Error fetching owned shops:', error)
      setError('Failed to load your shops. Please try again.')
    }
  }

  const fetchShopProducts = async (shopId: string) => {
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
          description: data.description || 'No description available',
          price: data.price || 0,
          imageUrl: data.imageUrl || data.image_url || '',
          category: data.category || 'other',
          inStock: data.inStock !== false,
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

  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop)
    fetchShopProducts(shop.id)
  }

  const handleUpdateShop = async (updatedShop: Shop) => {
    try {
      const shopRef = doc(db, 'shops', updatedShop.id)
      await updateDoc(shopRef, {
        name: updatedShop.name,
        description: updatedShop.description,
        imageUrl: updatedShop.imageUrl,
        category: updatedShop.category,
        rating: updatedShop.rating,
        isActive: updatedShop.isActive,
        address: updatedShop.address,
        phone: updatedShop.phone,
        hours: updatedShop.hours,
        updatedAt: new Date()
      })
      
      // Update local state
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
        imageUrl: updatedProduct.imageUrl,
        category: updatedProduct.category,
        inStock: updatedProduct.inStock,
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
    } catch (error) {
      console.error('Error deleting product:', error)
      setError('Failed to delete product. Please try again.')
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
                <h3 className="font-semibold text-telegram-text">{shop.name}</h3>
                <p className="text-sm text-telegram-hint mt-1">{shop.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-telegram-hint">
                  <span className="flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    {shop.rating.toFixed(1)}
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
                  <Package className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shop Edit Modal */}
      {editingShop && (
        <ShopEditModal
          shop={editingShop}
          onSave={handleUpdateShop}
          onCancel={() => setEditingShop(null)}
        />
      )}

      {/* Products Management */}
      {selectedShop && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-telegram-text">
              Products - {selectedShop.name}
            </h2>
            <button
              onClick={() => setShowAddProduct(true)}
              className="flex items-center space-x-2 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-telegram-secondary-bg rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-telegram-text">{product.name}</h4>
                    <p className="text-sm text-telegram-hint mt-1">{product.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-lg font-bold text-telegram-button">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      <span className="text-xs text-telegram-hint capitalize">
                        {product.category}
                      </span>
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

      {/* Add Product Modal */}
      {showAddProduct && selectedShop && (
        <ProductEditModal
          shopId={selectedShop.id}
          onSave={handleAddProduct}
          onCancel={() => setShowAddProduct(false)}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          shopId={editingProduct.shopId}
          onSave={handleUpdateProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  )
}

// Shop Edit Modal Component
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
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">Edit Shop</h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
              className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              >
                <option value="food">Food</option>
                <option value="retail">Retail</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Star className="w-4 h-4 inline mr-1" />
                Rating
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value)})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Hours
              </label>
              <input
                type="text"
                value={formData.hours}
                onChange={(e) => setFormData({...formData, hours: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                placeholder="9:00 AM - 9:00 PM"
              />
            </div>
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

// Product Edit Modal Component
interface ProductEditModalProps {
  product?: Product
  shopId: string
  onSave: (product: any) => void
  onCancel: () => void
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, shopId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    imageUrl: product?.imageUrl || '',
    category: product?.category || 'other',
    inStock: product?.inStock ?? true,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">
            {product ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-telegram-text mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              >
                <option value="food">Food</option>
                <option value="drinks">Drinks</option>
                <option value="desserts">Desserts</option>
                <option value="appetizers">Appetizers</option>
                <option value="main">Main Course</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              <Image className="w-4 h-4 inline mr-1" />
              Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
              className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="inStock"
              checked={formData.inStock}
              onChange={(e) => setFormData({...formData, inStock: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="inStock" className="text-sm text-telegram-text">
              In Stock
            </label>
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

export default AdminPanel