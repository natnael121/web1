import React, { useEffect, useState } from 'react';
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
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from './src/lib/firebase';
import { useAuth } from './src/hooks/useAuth';
import { TelegramService } from './src/services/telegram';
import { imgbbService } from './src/services/imgbb';
import { Shop, Product, Category, Department } from './src/types';
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
  User,
  ArrowLeft,
  TestTube,
  Upload,
  Eye,
  EyeOff,
  MessageSquare
} from 'lucide-react';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: 'shop_owner' | 'admin';
  telegramBotToken?: string;
  businessInfo?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [ownedShops, setOwnedShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'departments' | 'analytics' | 'profile'>('profile');
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');

  useEffect(() => {
    if (user?.uid) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedShop) {
      fetchShopData(selectedShop.id);
    }
  }, [selectedShop]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.uid) {
        setError('No user information available');
        return;
      }

      // Get user document from Firebase
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        setError('User not found in database');
        setLoading(false);
        return;
      }

      const userData = {
        uid: userDoc.id,
        ...userDoc.data(),
        createdAt: userDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: userDoc.data().updatedAt?.toDate() || new Date()
      } as UserData;
      
      setUserData(userData);
      setTelegramBotToken(userData.telegramBotToken || '');

      // Find shops owned by this user
      const shopsRef = collection(db, 'shops');
      const ownerQuery = query(shopsRef, where('ownerId', '==', user.uid));
      const shopsSnapshot = await getDocs(ownerQuery);

      const shopsList: Shop[] = [];
      shopsSnapshot.forEach((doc) => {
        const data = doc.data();
        const shop: Shop = {
          id: doc.id,
          ownerId: data.ownerId,
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
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
        };
        shopsList.push(shop);
      });

      setOwnedShops(shopsList);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopData = async (shopId: string) => {
    await Promise.all([
      fetchShopProducts(shopId),
      fetchShopCategories(shopId),
      fetchShopDepartments(shopId),
      fetchShopStats(shopId)
    ]);
  };

  const fetchShopProducts = async (shopId: string) => {
    try {
      const productsRef = collection(db, 'products');
      const productsQuery = query(
        productsRef, 
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc')
      );
      const productsSnapshot = await getDocs(productsQuery);
      
      const productsList: Product[] = [];
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
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
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        productsList.push(product);
      });

      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
    }
  };

  const fetchShopCategories = async (shopId: string) => {
    try {
      const categoriesRef = collection(db, 'categories');
      const categoriesQuery = query(
        categoriesRef, 
        where('shopId', '==', shopId),
        orderBy('order', 'asc')
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      
      const categoriesList: Category[] = [];
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data();
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
        };
        categoriesList.push(category);
      });

      setCategories(categoriesList);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again.');
    }
  };

  const fetchShopDepartments = async (shopId: string) => {
    try {
      const departmentsRef = collection(db, 'departments');
      const departmentsQuery = query(
        departmentsRef, 
        where('shopId', '==', shopId),
        orderBy('order', 'asc')
      );
      const departmentsSnapshot = await getDocs(departmentsQuery);
      
      const departmentsList: Department[] = [];
      departmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        const department: Department = {
          id: doc.id,
          userId: data.userId,
          shopId: data.shopId,
          name: data.name,
          telegramChatId: data.telegramChatId,
          adminChatId: data.adminChatId,
          role: data.role,
          order: data.order || 0,
          icon: data.icon,
          isActive: data.isActive !== false,
          notificationTypes: data.notificationTypes || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        departmentsList.push(department);
      });

      setDepartments(departmentsList);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to load departments. Please try again.');
    }
  };

  const fetchShopStats = async (shopId: string) => {
    try {
      // Get product count
      const productsRef = collection(db, 'products');
      const productsQuery = query(productsRef, where('shopId', '==', shopId), where('isActive', '==', true));
      const productsSnapshot = await getDocs(productsQuery);
      const totalProducts = productsSnapshot.size;
      
      // Get order stats
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, where('shopId', '==', shopId));
      const ordersSnapshot = await getDocs(ordersQuery);
      
      let totalOrders = 0;
      let totalRevenue = 0;
      const customerIds = new Set<string>();
      
      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        totalOrders++;
        totalRevenue += data.total || 0;
        if (data.customerId) {
          customerIds.add(data.customerId);
        }
      });
      
      const totalCustomers = customerIds.size;

      setStats({
        totalProducts,
        totalOrders,
        totalRevenue,
        totalCustomers
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleShopSelect = async (shop: Shop) => {
    setSelectedShop(shop);
    setActiveTab('products');
    setError(null);
    await fetchShopData(shop.id);
  };

  const testTelegramConnection = async (chatId: string, departmentName: string) => {
    if (!chatId || !telegramBotToken) {
      alert('Please enter a