import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc 
} from 'firebase/firestore'
import { db } from './firebase'

// Function to register a Telegram user as customer for a shop
export async function registerCustomer(shopId: string, telegramUser: any) {
  try {
    const shopCustomersRef = collection(db, 'shop_customers')

    // Query for existing shop-customer link
    const customerQuery = query(
      shopCustomersRef,
      where('shopId', '==', shopId),
      where('telegramId', '==', telegramUser.id.toString())
    )

    const snapshot = await getDocs(customerQuery)

    if (snapshot.empty) {
      // New entry for this shop
      await addDoc(shopCustomersRef, {
        shopId,
        telegramId: telegramUser.id.toString(),
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || null,
        lastName: telegramUser.last_name || null,
        joinedAt: new Date(),
        role: 'customer' // could be 'admin' if it's the owner
      })

      console.log(`✅ New customer registered for shop: ${shopId}`)
      return { status: 'new_registered', shopId }
    } else {
      console.log(`ℹ️ Customer already linked to shop: ${shopId}`)
      return { status: 'already_exists', shopId }
    }

  } catch (error) {
    console.error('❌ Error registering customer:', error)
    throw error
  }
}
