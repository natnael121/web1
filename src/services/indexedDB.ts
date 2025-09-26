// IndexedDB service for offline caching
export interface CacheItem<T = any> {
  id: string
  data: T
  timestamp: number
  version: number
  synced: boolean
  deleted?: boolean
}

export interface SyncQueue {
  id: string
  collection: string
  operation: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  retries: number
}

class IndexedDBService {
  private db: IDBDatabase | null = null
  private dbName = 'MultiShopCache'
  private version = 1
  private stores = ['shops', 'products', 'categories', 'departments', 'orders', 'users', 'syncQueue']

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        this.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            
            // Add indexes for common queries
            if (storeName !== 'syncQueue') {
              store.createIndex('timestamp', 'timestamp')
              store.createIndex('synced', 'synced')
              store.createIndex('shopId', 'data.shopId', { unique: false })
            } else {
              store.createIndex('timestamp', 'timestamp')
              store.createIndex('collection', 'collection')
            }
          }
        })
      }
    })
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init()
    }
    const transaction = this.db!.transaction([storeName], mode)
    return transaction.objectStore(storeName)
  }

  // Generic CRUD operations
  async get<T>(storeName: string, id: string): Promise<CacheItem<T> | null> {
    try {
      const store = await this.getStore(storeName)
      return new Promise((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Error getting item from ${storeName}:`, error)
      return null
    }
  }

  async getAll<T>(storeName: string, filter?: (item: CacheItem<T>) => boolean): Promise<CacheItem<T>[]> {
    try {
      const store = await this.getStore(storeName)
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          let results = request.result || []
          if (filter) {
            results = results.filter(filter)
          }
          resolve(results)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Error getting all items from ${storeName}:`, error)
      return []
    }
  }

  async set<T>(storeName: string, id: string, data: T, synced: boolean = false): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite')
      const cacheItem: CacheItem<T> = {
        id,
        data,
        timestamp: Date.now(),
        version: 1,
        synced
      }

      return new Promise((resolve, reject) => {
        const request = store.put(cacheItem)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Error setting item in ${storeName}:`, error)
      throw error
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Error deleting item from ${storeName}:`, error)
      throw error
    }
  }

  async clear(storeName: string): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Error clearing ${storeName}:`, error)
      throw error
    }
  }

  // Sync queue operations
  async addToSyncQueue(collection: string, operation: 'create' | 'update' | 'delete', data: any): Promise<void> {
    const syncItem: SyncQueue = {
      id: `${collection}_${operation}_${Date.now()}_${Math.random()}`,
      collection,
      operation,
      data,
      timestamp: Date.now(),
      retries: 0
    }

    const store = await this.getStore('syncQueue', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(syncItem)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    return this.getAll<SyncQueue>('syncQueue')
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    return this.delete('syncQueue', id)
  }

  async updateSyncQueueRetries(id: string, retries: number): Promise<void> {
    const item = await this.get<SyncQueue>('syncQueue', id)
    if (item) {
      item.retries = retries
      const store = await this.getStore('syncQueue', 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.put(item)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }

  // Utility methods
  async getLastSyncTime(collection: string): Promise<number> {
    try {
      const items = await this.getAll(collection)
      if (items.length === 0) return 0
      return Math.max(...items.map(item => item.timestamp))
    } catch (error) {
      console.error(`Error getting last sync time for ${collection}:`, error)
      return 0
    }
  }

  async markAsSynced(storeName: string, id: string): Promise<void> {
    const item = await this.get(storeName, id)
    if (item) {
      item.synced = true
      item.timestamp = Date.now()
      const store = await this.getStore(storeName, 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.put(item)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }

  async getUnsyncedItems<T>(storeName: string): Promise<CacheItem<T>[]> {
    return this.getAll<T>(storeName, item => !item.synced)
  }
}

export const indexedDBService = new IndexedDBService()