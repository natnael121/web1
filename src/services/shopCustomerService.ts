import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore'
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
    customerId: string,
    telegramId: number,
    role: 'admin' | 'customer' = 'customer'
  ): Promise<boolean> {
    try {
      const shopCustomersRef = collection(db, 'shop_customers')
      await addDoc(shopCustomersRef, {
        customerId,
        telegramId,
        shopId,
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

  async getUserIdByTelegramId(db: Firestore, telegramId: number): Promise<string | null> {
    try {
      const usersRef = collection(db, 'users')
      const userQuery = query(
        usersRef,
        where('telegramId', '==', telegramId)
      )
      const snapshot = await getDocs(userQuery)

      if (snapshot.empty) {
        const altQuery = query(usersRef, where('telegram_id', '==', telegramId))
        const altSnapshot = await getDocs(altQuery)

        if (altSnapshot.empty) {
          return null
        }
        return altSnapshot.docs[0].id
      }

      return snapshot.docs[0].id
    } catch (error) {
      console.error('Error getting user ID:', error)
      return null
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

  async createUserIfNotExists(
    db: Firestore,
    telegramId: number,
    displayName: string = 'Customer'
  ): Promise<string | null> {
    try {
      console.log('[shopCustomerService] Checking if user exists:', telegramId)
      const userId = await this.getUserIdByTelegramId(db, telegramId)

      if (userId) {
        console.log('[shopCustomerService] User already exists with ID:', userId)
        return userId
      }

      console.log('[shopCustomerService] User not found, creating new user...')
      const usersRef = collection(db, 'users')
      const newUserData = {
        displayName,
        telegramId,
        telegram_id: telegramId,
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      console.log('[shopCustomerService] New user data:', newUserData)
      const userDocRef = await addDoc(usersRef, newUserData)
      console.log('[shopCustomerService] Created new user with ID:', userDocRef.id)
      return userDocRef.id
    } catch (error) {
      console.error('[shopCustomerService] Error creating user:', error)
      return null
    }
  },

  async handleShopLinkAccess(
    db: Firestore,
    startParam: string,
    telegramId: number,
    displayName?: string
  ): Promise<ShopAccessResult> {
    try {
      console.log('[shopCustomerService] Starting handleShopLinkAccess', { startParam, telegramId, displayName })
      const { shopId, productId } = await this.parseStartParam(startParam)
      console.log('[shopCustomerService] Parsed params:', { shopId, productId })

      const shopExists = await this.verifyShopExists(db, shopId)
      console.log('[shopCustomerService] Shop exists:', shopExists)
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
      console.log('[shopCustomerService] Is existing customer:', isExistingCustomer)

      if (!isExistingCustomer) {
        let userId = await this.getUserIdByTelegramId(db, telegramId)
        console.log('[shopCustomerService] Existing userId:', userId)

        if (!userId) {
          console.log('[shopCustomerService] Creating new user...')
          userId = await this.createUserIfNotExists(db, telegramId, displayName)

          if (!userId) {
            console.error('[shopCustomerService] Failed to create user')
            return {
              success: false,
              shopId: null,
              productId: null,
              isNewCustomer: false,
              error: 'Failed to create user record'
            }
          }
        }

        console.log('[shopCustomerService] Adding customer to shop...', { userId, shopId, telegramId })
        const added = await this.addCustomerToShop(db, shopId, userId, telegramId, 'customer')
        console.log('[shopCustomerService] Customer added:', added)

        if (!added) {
          return {
            success: false,
            shopId: null,
            productId: null,
            isNewCustomer: false,
            error: 'Failed to add customer to shop'
          }
        }

        console.log('[shopCustomerService] Success! New customer added')
        return {
          success: true,
          shopId,
          productId,
          isNewCustomer: true
        }
      }

      console.log('[shopCustomerService] Success! Existing customer')
      return {
        success: true,
        shopId,
        productId,
        isNewCustomer: false
      }
    } catch (error) {
      console.error('[shopCustomerService] Error handling shop link access:', error)
      return {
        success: false,
        shopId: null,
        productId: null,
        isNewCustomer: false,
        error: 'Failed to process shop link'
      }
    }
  }
}
 