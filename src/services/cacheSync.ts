import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { indexedDBService, SyncQueue } from './indexedDB'
import { Firestore } from 'firebase/firestore'

export interface SyncOptions {
  batchSize?: number
  maxRetries?: number
  retryDelay?: number
  syncInterval?: number
}

class CacheSyncService {
  private db: Firestore | null = null
  private syncWorker: Worker | null = null
  private syncInterval: number = 30000 // 30 seconds
  private isOnline: boolean = navigator.onLine
  private syncInProgress: boolean = false
  private listeners: Map<string, () => void> = new Map()

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.startSync()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      this.stopSync()
    })
  }

  init(firestore: Firestore, options: SyncOptions = {}) {
    this.db = firestore
    this.syncInterval = options.syncInterval || 30000
    
    // Initialize IndexedDB
    indexedDBService.init().then(() => {
      console.log('IndexedDB initialized')
      if (this.isOnline) {
        this.startSync()
      }
    }).catch(error => {
      console.error('Failed to initialize IndexedDB:', error)
    })
  }

  private startSync() {
    if (this.syncInProgress || !this.isOnline || !this.db) return
    
    // Start periodic sync
    this.performSync()
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync()
      }
    }, this.syncInterval)
  }

  private stopSync() {
    // Sync will naturally stop due to online check
  }

  private async performSync() {
    if (this.syncInProgress || !this.isOnline || !this.db) return
    
    this.syncInProgress = true
    
    try {
      // Run sync operations in background using requestIdleCallback
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          await this.syncFromFirebase()
          await this.syncToFirebase()
          this.syncInProgress = false
        }, { timeout: 5000 })
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          await this.syncFromFirebase()
          await this.syncToFirebase()
          this.syncInProgress = false
        }, 0)
      }
    } catch (error) {
      console.error('Sync error:', error)
      this.syncInProgress = false
    }
  }

  // Sync data from Firebase to IndexedDB
  private async syncFromFirebase() {
    if (!this.db) return

    const collections = ['shops', 'products', 'categories', 'departments', 'orders', 'users']
    
    for (const collectionName of collections) {
      try {
        const lastSyncTime = await indexedDBService.getLastSyncTime(collectionName)
        const collectionRef = collection(this.db, collectionName)
        
        let q = query(collectionRef, orderBy('updatedAt', 'desc'), limit(50))
        
        if (lastSyncTime > 0) {
          q = query(
            collectionRef, 
            where('updatedAt', '>', Timestamp.fromMillis(lastSyncTime)),
            orderBy('updatedAt', 'desc'),
            limit(50)
          )
        }

        const snapshot = await getDocs(q)
        
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data()
          await indexedDBService.set(collectionName, docSnapshot.id, {
            id: docSnapshot.id,
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date()
          }, true)
        }
        
        console.log(`Synced ${snapshot.docs.length} items from ${collectionName}`)
      } catch (error) {
        console.error(`Error syncing ${collectionName} from Firebase:`, error)
      }
    }
  }

  // Sync pending changes to Firebase
  private async syncToFirebase() {
    if (!this.db) return

    const syncQueue = await indexedDBService.getSyncQueue()
    
    for (const syncItem of syncQueue) {
      try {
        await this.processSyncItem(syncItem)
        await indexedDBService.removeSyncQueueItem(syncItem.id)
      } catch (error) {
        console.error('Error processing sync item:', error)
        
        // Increment retry count
        const newRetries = syncItem.retries + 1
        if (newRetries < 3) {
          await indexedDBService.updateSyncQueueRetries(syncItem.id, newRetries)
        } else {
          // Remove after max retries
          await indexedDBService.removeSyncQueueItem(syncItem.id)
          console.error('Max retries reached for sync item:', syncItem)
        }
      }
    }
  }

  private async processSyncItem(syncItem: SyncQueue) {
    if (!this.db) return

    const { collection: collectionName, operation, data } = syncItem
    const collectionRef = collection(this.db, collectionName)

    switch (operation) {
      case 'create':
        const docRef = await addDoc(collectionRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        // Update local cache with Firebase ID
        await indexedDBService.set(collectionName, docRef.id, {
          id: docRef.id,
          ...data
        }, true)
        break

      case 'update':
        const updateDocRef = doc(this.db, collectionName, data.id)
        await updateDoc(updateDocRef, {
          ...data,
          updatedAt: new Date()
        })
        await indexedDBService.markAsSynced(collectionName, data.id)
        break

      case 'delete':
        const deleteDocRef = doc(this.db, collectionName, data.id)
        await deleteDoc(deleteDocRef)
        await indexedDBService.delete(collectionName, data.id)
        break
    }
  }

  // Public API methods
  async getCachedData<T>(collectionName: string, id?: string): Promise<T[] | T | null> {
    if (id) {
      const item = await indexedDBService.get(collectionName, id)
      return item ? item.data : null
    } else {
      const items = await indexedDBService.getAll(collectionName)
      return items.map(item => item.data).filter(data => !data.deleted)
    }
  }

  async setCachedData<T>(collectionName: string, id: string, data: T, syncToFirebase: boolean = true): Promise<void> {
    // Store in cache immediately
    await indexedDBService.set(collectionName, id, data, !syncToFirebase)
    
    // Add to sync queue if needed
    if (syncToFirebase && this.isOnline) {
      const existingItem = await indexedDBService.get(collectionName, id)
      const operation = existingItem?.synced ? 'update' : 'create'
      await indexedDBService.addToSyncQueue(collectionName, operation, data)
      
      // Trigger immediate sync for important operations
      if (!this.syncInProgress) {
        setTimeout(() => this.performSync(), 100)
      }
    }
  }

  async deleteCachedData(collectionName: string, id: string, syncToFirebase: boolean = true): Promise<void> {
    if (syncToFirebase && this.isOnline) {
      await indexedDBService.addToSyncQueue(collectionName, 'delete', { id })
    }
    
    await indexedDBService.delete(collectionName, id)
    
    // Trigger immediate sync
    if (syncToFirebase && !this.syncInProgress) {
      setTimeout(() => this.performSync(), 100)
    }
  }

  async clearCache(collectionName?: string): Promise<void> {
    if (collectionName) {
      await indexedDBService.clear(collectionName)
    } else {
      const collections = ['shops', 'products', 'categories', 'departments', 'orders', 'users']
      for (const collection of collections) {
        await indexedDBService.clear(collection)
      }
    }
  }

  // Real-time listeners with cache fallback
  setupRealtimeListener<T>(
    collectionName: string, 
    callback: (data: T[]) => void,
    queryConstraints?: any[]
  ): () => void {
    if (!this.db) {
      // Fallback to cached data
      this.getCachedData<T>(collectionName).then(data => {
        callback(Array.isArray(data) ? data : data ? [data] : [])
      })
      return () => {}
    }

    const collectionRef = collection(this.db, collectionName)
    let q = collectionRef

    if (queryConstraints && queryConstraints.length > 0) {
      q = query(collectionRef, ...queryConstraints)
    }

    // First, load from cache
    this.getCachedData<T>(collectionName).then(cachedData => {
      if (cachedData) {
        callback(Array.isArray(cachedData) ? cachedData : [cachedData])
      }
    })

    // Then setup real-time listener
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data: T[] = []
        snapshot.forEach(doc => {
          const docData = doc.data()
          const item = {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date()
          } as T
          data.push(item)
          
          // Update cache in background
          indexedDBService.set(collectionName, doc.id, item, true)
        })
        callback(data)
      },
      (error) => {
        console.error(`Real-time listener error for ${collectionName}:`, error)
        // Fallback to cached data on error
        this.getCachedData<T>(collectionName).then(cachedData => {
          if (cachedData) {
            callback(Array.isArray(cachedData) ? cachedData : [cachedData])
          }
        })
      }
    )

    this.listeners.set(collectionName, unsubscribe)
    return unsubscribe
  }

  // Utility methods
  isOffline(): boolean {
    return !this.isOnline
  }

  async getSyncStatus(): Promise<{
    pendingSync: number
    lastSyncTime: number
    isOnline: boolean
  }> {
    const syncQueue = await indexedDBService.getSyncQueue()
    return {
      pendingSync: syncQueue.length,
      lastSyncTime: Date.now(), // You might want to store this properly
      isOnline: this.isOnline
    }
  }

  async forcSync(): Promise<void> {
    if (this.isOnline && !this.syncInProgress) {
      await this.performSync()
    }
  }
}

export const cacheSyncService = new CacheSyncService()