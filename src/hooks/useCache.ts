import { useState, useEffect, useCallback } from 'react'
import { cacheSyncService } from '../services/cacheSync'

export interface UseCacheOptions {
  enableRealtime?: boolean
  fallbackToCache?: boolean
  syncOnMount?: boolean
}

export function useCache<T>(
  collectionName: string,
  id?: string,
  options: UseCacheOptions = {}
) {
  const [data, setData] = useState<T | T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(cacheSyncService.isOffline())

  const {
    enableRealtime = true,
    fallbackToCache = true,
    syncOnMount = true
  } = options

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const cachedData = await cacheSyncService.getCachedData<T>(collectionName, id)
      setData(cachedData)
      
      if (syncOnMount && !cacheSyncService.isOffline()) {
        await cacheSyncService.forcSync()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [collectionName, id, syncOnMount])

  // Update data function
  const updateData = useCallback(async (newData: T, syncToFirebase: boolean = true) => {
    try {
      if (!id) throw new Error('ID is required for updates')
      
      await cacheSyncService.setCachedData(collectionName, id, newData, syncToFirebase)
      
      // Update local state immediately for better UX
      setData(newData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data')
      throw err
    }
  }, [collectionName, id])

  // Delete data function
  const deleteData = useCallback(async (syncToFirebase: boolean = true) => {
    try {
      if (!id) throw new Error('ID is required for deletion')
      
      await cacheSyncService.deleteCachedData(collectionName, id, syncToFirebase)
      setData(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data')
      throw err
    }
  }, [collectionName, id])

  // Create data function
  const createData = useCallback(async (newData: T & { id: string }, syncToFirebase: boolean = true) => {
    try {
      await cacheSyncService.setCachedData(collectionName, newData.id, newData, syncToFirebase)
      
      // If we're loading a collection, refresh the data
      if (!id) {
        await loadData()
      } else {
        setData(newData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data')
      throw err
    }
  }, [collectionName, id, loadData])

  // Setup real-time listener or load data on mount
  useEffect(() => {
    if (enableRealtime && !id) {
      // Setup real-time listener for collections
      const unsubscribe = cacheSyncService.setupRealtimeListener<T>(
        collectionName,
        (newData) => {
          setData(newData)
          setLoading(false)
        }
      )
      return unsubscribe
    } else {
      // Load data once for single documents or when real-time is disabled
      loadData()
    }
  }, [collectionName, id, enableRealtime, loadData])

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    data,
    loading,
    error,
    isOffline,
    updateData,
    deleteData,
    createData,
    refetch: loadData
  }
}

// Specialized hooks for common use cases
export function useShops() {
  return useCache<any>('shops')
}

export function useShop(shopId: string) {
  return useCache<any>('shops', shopId)
}

export function useProducts(shopId?: string) {
  const result = useCache<any>('products')
  
  // Filter by shopId if provided
  const filteredData = shopId && result.data && Array.isArray(result.data)
    ? result.data.filter((product: any) => product.shopId === shopId)
    : result.data

  return {
    ...result,
    data: filteredData
  }
}

export function useProduct(productId: string) {
  return useCache<any>('products', productId)
}

export function useCategories(shopId?: string) {
  const result = useCache<any>('categories')
  
  // Filter by shopId if provided
  const filteredData = shopId && result.data && Array.isArray(result.data)
    ? result.data.filter((category: any) => category.shopId === shopId)
    : result.data

  return {
    ...result,
    data: filteredData
  }
}

export function useDepartments(shopId?: string) {
  const result = useCache<any>('departments')
  
  // Filter by shopId if provided
  const filteredData = shopId && result.data && Array.isArray(result.data)
    ? result.data.filter((department: any) => department.shopId === shopId)
    : result.data

  return {
    ...result,
    data: filteredData
  }
}

export function useOrders(customerId?: string) {
  const result = useCache<any>('orders')
  
  // Filter by customerId if provided
  const filteredData = customerId && result.data && Array.isArray(result.data)
    ? result.data.filter((order: any) => order.customerId === customerId)
    : result.data

  return {
    ...result,
    data: filteredData
  }
}