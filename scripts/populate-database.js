const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

// Sample shop data that matches what your bot would display
const sampleShops = [
  {
    name: "Pizza Palace",
    description: "Authentic Italian pizzas made with fresh ingredients. Wood-fired oven, traditional recipes.",
    imageUrl: "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg",
    category: "food",
    rating: 4.5,
    isActive: true,
    address: "123 Main Street, Downtown",
    phone: "+1-555-0123",
    hours: "11:00 AM - 11:00 PM",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    name: "TechHub Electronics",
    description: "Latest smartphones, laptops, and gadgets. Authorized dealer with warranty support.",
    imageUrl: "https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg",
    category: "electronics",
    rating: 4.2,
    isActive: true,
    address: "456 Tech Avenue, Silicon District",
    phone: "+1-555-0456",
    hours: "9:00 AM - 9:00 PM",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    name: "Fashion Forward",
    description: "Trendy clothing and accessories for men and women. Latest fashion at affordable prices.",
    imageUrl: "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg",
    category: "clothing",
    rating: 4.3,
    isActive: true,
    address: "789 Fashion Blvd, Style Center",
    phone: "+1-555-0789",
    hours: "10:00 AM - 10:00 PM",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    name: "BookWorm Corner",
    description: "Extensive collection of books, magazines, and educational materials. Cozy reading space.",
    imageUrl: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg",
    category: "books",
    rating: 4.7,
    isActive: true,
    address: "321 Library Lane, Knowledge District",
    phone: "+1-555-0321",
    hours: "8:00 AM - 8:00 PM",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    name: "Burger Barn",
    description: "Juicy burgers, crispy fries, and milkshakes. Family-friendly atmosphere with quick service.",
    imageUrl: "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg",
    category: "food",
    rating: 4.1,
    isActive: true,
    address: "654 Burger Street, Food Court",
    phone: "+1-555-0654",
    hours: "10:00 AM - 12:00 AM",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    name: "Gadget Galaxy",
    description: "Smart home devices, gaming accessories, and tech innovations. Expert technical support.",
    imageUrl: "https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg",
    category: "electronics",
    rating: 4.4,
    isActive: true,
    address: "987 Innovation Drive, Tech Park",
    phone: "+1-555-0987",
    hours: "9:00 AM - 8:00 PM",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  }
];

// Sample products for each shop
const sampleProducts = [
  // Pizza Palace products
  {
    shopId: "pizza-palace",
    name: "Margherita Pizza",
    description: "Classic pizza with tomato sauce, mozzarella, and fresh basil",
    price: 12.99,
    imageUrl: "https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg",
    category: "pizza",
    inStock: true,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    shopId: "pizza-palace",
    name: "Pepperoni Pizza",
    description: "Traditional pepperoni pizza with extra cheese",
    price: 14.99,
    imageUrl: "https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg",
    category: "pizza",
    inStock: true,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  // TechHub Electronics products
  {
    shopId: "techhub-electronics",
    name: "iPhone 15 Pro",
    description: "Latest iPhone with advanced camera system and A17 Pro chip",
    price: 999.99,
    imageUrl: "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg",
    category: "smartphone",
    inStock: true,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    shopId: "techhub-electronics",
    name: "MacBook Air M2",
    description: "Lightweight laptop with M2 chip and all-day battery life",
    price: 1199.99,
    imageUrl: "https://images.pexels.com/photos/18105/pexels-photo.jpg",
    category: "laptop",
    inStock: true,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  }
];

async function populateDatabase() {
  try {
    console.log('Starting database population...');
    
    // Add shops
    const shopPromises = sampleShops.map(async (shop, index) => {
      const shopId = shop.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await db.collection('shops').doc(shopId).set(shop);
      console.log(`Added shop: ${shop.name}`);
      return shopId;
    });
    
    const shopIds = await Promise.all(shopPromises);
    
    // Add products
    const productPromises = sampleProducts.map(async (product) => {
      const productId = product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await db.collection('products').doc(productId).set(product);
      console.log(`Added product: ${product.name}`);
    });
    
    await Promise.all(productPromises);
    
    console.log('Database population completed successfully!');
    console.log(`Added ${sampleShops.length} shops and ${sampleProducts.length} products`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

populateDatabase();