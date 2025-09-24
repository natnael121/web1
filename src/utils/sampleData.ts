import { collection, addDoc, doc, setDoc } from 'firebase/firestore'
import { Firestore } from 'firebase/firestore'

export const sampleShops = [
  {
    id: 'shop1',
    name: 'Pizza Palace',
    description: 'Authentic Italian pizzas made with fresh ingredients and traditional recipes',
    imageUrl: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg',
    category: 'food',
    rating: 4.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'shop2',
    name: 'Tech Store',
    description: 'Latest electronics, gadgets, and tech accessories at competitive prices',
    imageUrl: 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg',
    category: 'electronics',
    rating: 4.2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'shop3',
    name: 'Fashion Hub',
    description: 'Trendy clothing and accessories for men and women of all ages',
    imageUrl: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg',
    category: 'clothing',
    rating: 4.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'shop4',
    name: 'Book Corner',
    description: 'Wide selection of books, magazines, and educational materials',
    imageUrl: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg',
    category: 'books',
    rating: 4.3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'shop5',
    name: 'Coffee Bean',
    description: 'Premium coffee, pastries, and light meals in a cozy atmosphere',
    imageUrl: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
    category: 'food',
    rating: 4.6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export const addSampleData = async (db: Firestore) => {
  try {
    console.log('Adding sample shops to Firebase...')
    
    for (const shop of sampleShops) {
      const { id, ...shopData } = shop
      await setDoc(doc(db, 'shops', id), shopData)
      console.log(`Added shop: ${shop.name}`)
    }
    
    console.log('Sample data added successfully!')
    return true
  } catch (error) {
    console.error('Error adding sample data:', error)
    return false
  }
}