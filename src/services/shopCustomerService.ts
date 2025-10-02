import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { Firestore } from 'firebase/firestore'

export interface ShopAccessResult {
  success: boolean
  shopId: string | null
  productId: string | null
  isNewCustomer: boolean
  error?: string
}

export const shopCustomerService = {
  async parseStartParam(startParam: string): Promise<{ shopId: string; productId: string | null }> {
    const parts = startParam.split('_')
    return {
      shopId: parts[0],
      productId: parts.length > 1 ? parts.slice(1).join('_') : null
    }
  },

  async checkIfCustomerExists(
    db: Firestore,
    shopId: string,
    telegramId: number
  ): Promise<boolean> {
    try {
      const shopCustomersRef = collection(db, 'shop_customers')
      const customerQuery = query(
        shopCustomersRef,
        where('shopId', '==', shopId),
        where('telegramId', '==', telegramId)
      )
      const snapshot = await getDocs(customerQuery)
      return !snapshot.empty
    } catch (error) {
      console.error('Error checking customer existence:', error)
      return false
    }
  },

  async addCustomerToShop(
    db: Firestore,
    shopId: string,
    telegramId: number,
    role: 'admin' | 'customer' = 'customer'
  ): Promise<boolean> {
    try {
      const shopCustomersRef = collection(db, 'shop_customers')
      await addDoc(shopCustomersRef, {
        shopId,
        telegramId,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return true
    } catch (error) {
      console.error('Error adding customer to shop:', error)
      return false
    }
  },

  async verifyShopExists(db: Firestore, shopId: string): Promise<boolean> {
    try {
      const shopRef = doc(db, 'shops', shopId)
      const shopDoc = await getDoc(shopRef)
      return shopDoc.exists() && shopDoc.data()?.isActive === true
    } catch (error) {
      console.error('Error verifying shop:', error)
      return false
    }
  },

  async handleShopLinkAccess(
    db: Firestore,
    startParam: string,
    telegramId: number
  ): Promise<ShopAccessResult> {
    try {
      const { shopId, productId } = await this.parseStartParam(startParam)

      const shopExists = await this.verifyShopExists(db, shopId)
      if (!shopExists) {
        return {
          success: false,
          shopId: null,
          productId: null,
          isNewCustomer: false,
          error: 'Shop not found or inactive'
        }
      }

      const isExistingCustomer = await this.checkIfCustomerExists(db, shopId, telegramId)

      if (!isExistingCustomer) {
        const added = await this.addCustomerToShop(db, shopId, telegramId, 'customer')

        if (!added) {
          return {
            success: false,
            shopId: null,
            productId: null,
            isNewCustomer: false,
            error: 'Failed to add customer to shop'
          }
        }

        return {
          success: true,
          shopId,
          productId,
          isNewCustomer: true
        }
      }

      return {
        success: true,
        shopId,
        productId,
        isNewCustomer: false
      }
    } catch (error) {
      console.error('Error handling shop link access:', error)
      return {
        success: false,
        shopId: null,
        productId: null,
        isNewCustomer: false,
        error: 'Failed to process shop link'
      }
    }
  },

  // ✅ New function: when admin creates a shop, register them as admin in shop_customers
  async createShopWithAdmin(
    db: Firestore,
    shopId: string,
    shopData: any,
    adminTelegramId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const shopRef = doc(db, 'shops', shopId)
      await setDoc(shopRef, {
        ...shopData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      })

      // Add admin as shop customer
      const added = await this.addCustomerToShop(db, shopId, adminTelegramId, 'admin')
      if (!added) {
        return { success: false, error: 'Failed to link admin to shop' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error creating shop with admin:', error)
      return { success: false, error: 'Failed to create shop' }
    }
  }
}
