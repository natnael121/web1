import React, { useState, useEffect, useRef, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { 
  collection, query, where, getDocs, doc, updateDoc, addDoc, writeBatch 
} from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { Product, Shop, InventoryLog } from '../../types'
import { 
  QrCode, Camera, Plus, Minus, RefreshCw, Printer, Search, AlertTriangle, 
  History, Package, Check, X, Sliders, Download, Upload, FileSpreadsheet, 
  CheckSquare, Square, DollarSign, TrendingUp, TrendingDown, AlertOctagon,
  Filter, ArrowUpDown, Tag, ShieldAlert, ClipboardList, ShoppingCart,
  BarChart3, Calendar, Eye, EyeOff, Bell, Percent, ArrowRight, 
  ChevronDown, ChevronUp, RotateCcw, Boxes, Truck, Star
} from 'lucide-react'

interface InventoryManagerProps {
  shop: Shop
  products: Product[]
  onRefreshProducts: () => void
  performedBy: string
}

// Stocktake row data
interface StocktakeRow {
  productId: string
  productName: string
  sku: string
  systemStock: number
  countedStock: number | null
  variance: number
  status: 'pending' | 'counted' | 'matched' | 'mismatch'
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  shop,
  products,
  onRefreshProducts,
  performedBy
}) => {
  const { db } = useFirebase()
  const [activeTab, setActiveTab] = useState<'stock' | 'logs' | 'batch_labels' | 'stocktake' | 'reorder' | 'analytics'>('stock')
  
  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'value_desc' | 'margin_desc'>('stock_asc')

  // Selected product for single adjustment
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockChangeQty, setStockChangeQty] = useState<number>(1)
  const [adjustType, setAdjustType] = useState<'stock_in' | 'stock_out' | 'adjustment' | 'damage'>('stock_in')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showBulkAdjustModal, setShowBulkAdjustModal] = useState(false)
  const [bulkQty, setBulkQty] = useState<number>(5)
  const [bulkActionType, setBulkActionType] = useState<'stock_in' | 'stock_out' | 'set_stock'>('stock_in')

  // QR Scanning State
  const [showScanner, setShowScanner] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Single Label Printing Modal State
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelProduct, setLabelProduct] = useState<Product | null>(null)

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  // Inventory Logs State & Filter
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all')
  const [logDateFrom, setLogDateFrom] = useState<string>('')
  const [logDateTo, setLogDateTo] = useState<string>('')
  const [logProductFilter, setLogProductFilter] = useState<string>('all')

  // Low Stock Alert Edit State
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null)
  const [editAlertValue, setEditAlertValue] = useState<number>(5)

  // Stocktake State
  const [stocktakeRows, setStocktakeRows] = useState<StocktakeRow[]>([])
  const [stocktakeActive, setStocktakeActive] = useState(false)
  const [stocktakeSaving, setStocktakeSaving] = useState(false)

  // Analytics expand/collapse
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false)

  // Quick adjust loading
  const [quickAdjustingId, setQuickAdjustingId] = useState<string | null>(null)

  // Load Inventory Logs
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [activeTab, shop.id])

  // Camera QR Scanner Initialization
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        },
        /* verbose= */ false
      )
      scannerRef.current = scanner

      scanner.render(
        (decodedText) => {
          handleQrScanned(decodedText)
          scanner.clear()
          setShowScanner(false)
        },
        () => {}
      )

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error('Error clearing scanner:', err))
        }
      }
    }
  }, [showScanner])

  // Extract unique categories from products
  const categoriesList = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  // Calculate Key Inventory Metrics
  const totalItemsCount = products.reduce((acc, p) => acc + (p.stock || 0), 0)
  const totalValuation = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0)
  const totalCostValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.costPrice || 0)), 0)
  const totalPotentialProfit = totalValuation - totalCostValue
  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.lowStockAlert || 5) && (p.stock || 0) > 0).length
  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length
  const avgStockPerProduct = products.length > 0 ? Math.round(totalItemsCount / products.length) : 0

  // Category Valuation Breakdown
  const categoryValuation = useMemo(() => {
    const map: Record<string, { value: number; count: number; stock: number }> = {}
    products.forEach(p => {
      const cat = p.category || 'Uncategorized'
      if (!map[cat]) map[cat] = { value: 0, count: 0, stock: 0 }
      map[cat].value += (p.stock || 0) * (p.price || 0)
      map[cat].count += 1
      map[cat].stock += (p.stock || 0)
    })
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
  }, [products])

  // Reorder suggestions: products that are at or below low stock alert
  const reorderSuggestions = useMemo(() => {
    return products
      .filter(p => (p.stock || 0) <= (p.lowStockAlert || 5))
      .map(p => ({
        ...p,
        suggestedQty: Math.max(10, (p.lowStockAlert || 5) * 3 - (p.stock || 0)),
        urgency: (p.stock || 0) <= 0 ? 'critical' : 'warning' as 'critical' | 'warning'
      }))
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
  }, [products])

  // Load Logs from Firestore
  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const logsRef = collection(db, 'inventory_logs')
      const q = query(logsRef, where('shopId', '==', shop.id))
      const snapshot = await getDocs(q)
      const list: InventoryLog[] = snapshot.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          shopId: data.shopId,
          productId: data.productId,
          productName: data.productName,
          sku: data.sku,
          previousStock: data.previousStock || 0,
          newStock: data.newStock || 0,
          changeQuantity: data.changeQuantity || 0,
          type: data.type || 'adjustment',
          notes: data.notes || '',
          performedBy: data.performedBy || 'Admin',
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now())
        }
      })

      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setLogs(list)
    } catch (err) {
      console.error('Error fetching inventory logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  // Handle scanned QR code value
  const handleQrScanned = (scannedData: string) => {
    let targetId = scannedData.trim()
    if (targetId.startsWith('woodshop:product:')) {
      targetId = targetId.replace('woodshop:product:', '')
    }

    const matched = products.find(
      p => p.id === targetId || (p.sku && p.sku.toLowerCase() === targetId.toLowerCase())
    )

    if (matched) {
      setSelectedProduct(matched)
      setMessage({ type: 'success', text: `Product scanned: ${matched.name}` })
    } else {
      setMessage({ type: 'error', text: `No product found matching scanned code: ${scannedData}` })
    }
  }

  // Telegram Native QR Scanner Fallback
  const handleStartNativeScan = () => {
    if (window.Telegram?.WebApp?.showScanQrPopup) {
      window.Telegram.WebApp.showScanQrPopup({ text: 'Scan Product QR Code' }, (data: string) => {
        handleQrScanned(data)
        if (window.Telegram?.WebApp?.closeScanQrPopup) {
          window.Telegram.WebApp.closeScanQrPopup()
        }
        return true
      })
    } else {
      setShowScanner(true)
    }
  }

  // Quick +1/-1 Stock Adjust (inline from product list)
  const handleQuickAdjust = async (product: Product, delta: number) => {
    try {
      setQuickAdjustingId(product.id)
      const prevStock = product.stock || 0
      const newStock = Math.max(0, prevStock + delta)

      const productRef = doc(db, 'products', product.id)
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: new Date()
      })

      const logsRef = collection(db, 'inventory_logs')
      await addDoc(logsRef, {
        shopId: shop.id,
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        previousStock: prevStock,
        newStock: newStock,
        changeQuantity: delta,
        type: delta > 0 ? 'stock_in' : 'stock_out',
        notes: `Quick adjust ${delta > 0 ? '+' : ''}${delta}`,
        performedBy: performedBy || 'Shop Admin',
        createdAt: new Date()
      })

      setMessage({ type: 'success', text: `${product.name}: ${prevStock} → ${newStock}` })
      onRefreshProducts()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Quick adjust failed.' })
    } finally {
      setQuickAdjustingId(null)
    }
  }

  // Save Single Product Inventory Adjustment
  const handleSaveAdjustment = async () => {
    if (!selectedProduct) return

    try {
      setSaving(true)
      setMessage(null)

      const prevStock = selectedProduct.stock || 0
      let newStock = prevStock

      if (adjustType === 'stock_in') {
        newStock = prevStock + Math.abs(stockChangeQty)
      } else if (adjustType === 'stock_out' || adjustType === 'damage') {
        newStock = Math.max(0, prevStock - Math.abs(stockChangeQty))
      } else if (adjustType === 'adjustment') {
        newStock = Math.max(0, stockChangeQty)
      }

      const diff = newStock - prevStock

      const productRef = doc(db, 'products', selectedProduct.id)
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: new Date()
      })

      const logsRef = collection(db, 'inventory_logs')
      await addDoc(logsRef, {
        shopId: shop.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku || '',
        previousStock: prevStock,
        newStock: newStock,
        changeQuantity: diff,
        type: adjustType,
        notes: adjustNotes.trim(),
        performedBy: performedBy || 'Shop Admin',
        createdAt: new Date()
      })

      setMessage({ 
        type: 'success', 
        text: `Stock updated for ${selectedProduct.name}: ${prevStock} ➔ ${newStock}` 
      })

      setSelectedProduct({
        ...selectedProduct,
        stock: newStock
      })

      setAdjustNotes('')
      onRefreshProducts()
    } catch (err: any) {
      console.error('Error saving inventory adjustment:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to update inventory stock.' })
    } finally {
      setSaving(false)
    }
  }

  // Update Low Stock Alert Threshold
  const handleSaveAlertThreshold = async (product: Product) => {
    try {
      const productRef = doc(db, 'products', product.id)
      await updateDoc(productRef, {
        lowStockAlert: editAlertValue,
        updatedAt: new Date()
      })
      setMessage({ type: 'success', text: `Alert threshold for ${product.name} set to ${editAlertValue}` })
      setEditingAlertId(null)
      onRefreshProducts()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update alert threshold.' })
    }
  }

  // Bulk Stock Adjust Handler
  const handleBulkAdjust = async () => {
    if (selectedProductIds.length === 0) return

    try {
      setSaving(true)
      setMessage(null)

      const batch = writeBatch(db)
      const logsRef = collection(db, 'inventory_logs')

      let updatedCount = 0

      for (const id of selectedProductIds) {
        const prod = products.find(p => p.id === id)
        if (!prod) continue

        const prevStock = prod.stock || 0
        let newStock = prevStock

        if (bulkActionType === 'stock_in') {
          newStock = prevStock + Math.abs(bulkQty)
        } else if (bulkActionType === 'stock_out') {
          newStock = Math.max(0, prevStock - Math.abs(bulkQty))
        } else if (bulkActionType === 'set_stock') {
          newStock = Math.max(0, bulkQty)
        }

        const diff = newStock - prevStock

        const prodRef = doc(db, 'products', prod.id)
        batch.update(prodRef, { stock: newStock, updatedAt: new Date() })

        await addDoc(logsRef, {
          shopId: shop.id,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku || '',
          previousStock: prevStock,
          newStock: newStock,
          changeQuantity: diff,
          type: bulkActionType === 'stock_in' ? 'stock_in' : (bulkActionType === 'stock_out' ? 'stock_out' : 'adjustment'),
          notes: `Batch update for ${selectedProductIds.length} items`,
          performedBy: performedBy || 'Shop Admin',
          createdAt: new Date()
        })

        updatedCount++
      }

      await batch.commit()

      setMessage({
        type: 'success',
        text: `Bulk updated stock for ${updatedCount} items successfully!`
      })

      setShowBulkAdjustModal(false)
      setSelectedProductIds([])
      onRefreshProducts()
    } catch (err: any) {
      console.error('Error executing bulk stock update:', err)
      setMessage({ type: 'error', text: err.message || 'Bulk update failed.' })
    } finally {
      setSaving(false)
    }
  }

  // Export Inventory CSV
  const exportInventoryCSV = () => {
    const headers = ['Product ID', 'SKU', 'Product Name', 'Category', 'Stock', 'Price', 'Cost Price', 'Total Valuation', 'Profit Margin %', 'Low Stock Threshold']
    const rows = filteredProducts.map(p => {
      const margin = p.costPrice && p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(1) : 'N/A'
      return [
        p.id,
        p.sku || '',
        `"${p.name.replace(/"/g, '""')}"`,
        p.category || 'General',
        p.stock || 0,
        (p.price || 0).toFixed(2),
        (p.costPrice || 0).toFixed(2),
        ((p.stock || 0) * (p.price || 0)).toFixed(2),
        margin,
        p.lowStockAlert || 5
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${shop.name.replace(/[^a-zA-Z0-9]/g, '_')}_inventory_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Audit Logs CSV
  const exportLogsCSV = () => {
    const headers = ['Date', 'Product', 'SKU', 'Type', 'Previous Stock', 'New Stock', 'Change', 'Notes', 'Performed By']
    const rows = filteredLogs.map(l => [
      l.createdAt.toISOString(),
      `"${l.productName.replace(/"/g, '""')}"`,
      l.sku || '',
      l.type,
      l.previousStock,
      l.newStock,
      l.changeQuantity,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.performedBy
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${shop.name.replace(/[^a-zA-Z0-9]/g, '_')}_audit_logs_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Import CSV File Stock Update
  const handleImportCSV = async () => {
    if (!importFile) return

    try {
      setImporting(true)
      const text = await importFile.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

      if (lines.length < 2) {
        throw new Error('CSV file is empty or missing data rows.')
      }

      const headers = lines[0].toLowerCase().split(',')
      const skuIdx = headers.findIndex(h => h.includes('sku'))
      const stockIdx = headers.findIndex(h => h.includes('stock'))
      const idIdx = headers.findIndex(h => h.includes('id'))

      if (stockIdx === -1) {
        throw new Error('CSV must contain a "stock" column.')
      }

      let updatedCount = 0

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        const targetId = idIdx !== -1 ? row[idIdx] : null
        const targetSku = skuIdx !== -1 ? row[skuIdx] : null
        const newStock = parseInt(row[stockIdx])

        if (isNaN(newStock)) continue

        const matched = products.find(p => 
          (targetId && p.id === targetId) || 
          (targetSku && p.sku && p.sku.toLowerCase() === targetSku.toLowerCase())
        )

        if (matched) {
          const productRef = doc(db, 'products', matched.id)
          await updateDoc(productRef, { stock: Math.max(0, newStock), updatedAt: new Date() })

          const logsRef = collection(db, 'inventory_logs')
          await addDoc(logsRef, {
            shopId: shop.id,
            productId: matched.id,
            productName: matched.name,
            sku: matched.sku || '',
            previousStock: matched.stock || 0,
            newStock: Math.max(0, newStock),
            changeQuantity: Math.max(0, newStock) - (matched.stock || 0),
            type: 'adjustment',
            notes: `CSV Import update from file: ${importFile.name}`,
            performedBy: performedBy || 'CSV Import',
            createdAt: new Date()
          })

          updatedCount++
        }
      }

      setMessage({ type: 'success', text: `CSV Import completed! Updated ${updatedCount} products.` })
      setShowImportModal(false)
      setImportFile(null)
      onRefreshProducts()
    } catch (err: any) {
      console.error('Error importing CSV:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to process CSV file.' })
    } finally {
      setImporting(false)
    }
  }

  // Toggle selection of products for bulk actions
  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id))
    }
  }

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Print Label Handler
  const handlePrintLabel = (product: Product) => {
    setLabelProduct(product)
    setShowLabelModal(true)
  }

  const printCurrentLabel = () => {
    window.print()
  }

  // --- Stocktake Functions ---
  const startStocktake = () => {
    const rows: StocktakeRow[] = filteredProducts.map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku || '',
      systemStock: p.stock || 0,
      countedStock: null,
      variance: 0,
      status: 'pending'
    }))
    setStocktakeRows(rows)
    setStocktakeActive(true)
    setActiveTab('stocktake')
  }

  const updateStocktakeCount = (productId: string, counted: number | null) => {
    setStocktakeRows(prev => prev.map(r => {
      if (r.productId !== productId) return r
      const variance = counted !== null ? counted - r.systemStock : 0
      return {
        ...r,
        countedStock: counted,
        variance,
        status: counted === null ? 'pending' : (variance === 0 ? 'matched' : 'mismatch')
      }
    }))
  }

  const applyStocktakeResults = async () => {
    const mismatches = stocktakeRows.filter(r => r.status === 'mismatch' && r.countedStock !== null)
    if (mismatches.length === 0) {
      setMessage({ type: 'error', text: 'No variances to apply. All counted items match system stock.' })
      return
    }

    try {
      setStocktakeSaving(true)
      const batch = writeBatch(db)
      const logsRef = collection(db, 'inventory_logs')

      for (const row of mismatches) {
        const prodRef = doc(db, 'products', row.productId)
        const newStock = Math.max(0, row.countedStock!)
        batch.update(prodRef, { stock: newStock, updatedAt: new Date() })

        await addDoc(logsRef, {
          shopId: shop.id,
          productId: row.productId,
          productName: row.productName,
          sku: row.sku,
          previousStock: row.systemStock,
          newStock: newStock,
          changeQuantity: newStock - row.systemStock,
          type: 'adjustment',
          notes: `Stocktake adjustment (variance: ${row.variance > 0 ? '+' : ''}${row.variance})`,
          performedBy: performedBy || 'Stocktake',
          createdAt: new Date()
        })
      }

      await batch.commit()
      setMessage({ type: 'success', text: `Stocktake applied! ${mismatches.length} products adjusted.` })
      setStocktakeActive(false)
      setStocktakeRows([])
      setActiveTab('stock')
      onRefreshProducts()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to apply stocktake.' })
    } finally {
      setStocktakeSaving(false)
    }
  }

  // Stocktake QR scan to auto-focus row
  const handleStocktakeQrScan = () => {
    if (window.Telegram?.WebApp?.showScanQrPopup) {
      window.Telegram.WebApp.showScanQrPopup({ text: 'Scan product to count' }, (data: string) => {
        let targetId = data.trim()
        if (targetId.startsWith('woodshop:product:')) {
          targetId = targetId.replace('woodshop:product:', '')
        }
        const row = stocktakeRows.find(r => r.productId === targetId || r.sku.toLowerCase() === targetId.toLowerCase())
        if (row) {
          // Focus the input for this row (increment count by 1)
          const current = row.countedStock ?? 0
          updateStocktakeCount(row.productId, current + 1)
          setMessage({ type: 'success', text: `Scanned: ${row.productName} (count: ${current + 1})` })
        } else {
          setMessage({ type: 'error', text: `Product not found in stocktake: ${data}` })
        }
        if (window.Telegram?.WebApp?.closeScanQrPopup) {
          window.Telegram.WebApp.closeScanQrPopup()
        }
        return true
      })
    } else {
      setMessage({ type: 'error', text: 'QR scanning is only available in the Telegram app.' })
    }
  }

  // Filter & Sort Products List
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    
    let matchesStatus = true
    if (statusFilter === 'low_stock') {
      matchesStatus = (p.stock || 0) <= (p.lowStockAlert || 5) && (p.stock || 0) > 0
    } else if (statusFilter === 'out_of_stock') {
      matchesStatus = (p.stock || 0) <= 0
    } else if (statusFilter === 'in_stock') {
      matchesStatus = (p.stock || 0) > (p.lowStockAlert || 5)
    }

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0)
    if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0)
    if (sortBy === 'value_desc') return ((b.stock || 0) * (b.price || 0)) - ((a.stock || 0) * (a.price || 0))
    if (sortBy === 'margin_desc') {
      const mA = a.costPrice ? ((a.price - a.costPrice) / a.price) : 0
      const mB = b.costPrice ? ((b.price - b.costPrice) / b.price) : 0
      return mB - mA
    }
    return 0
  })

  // Filtered Logs with date range & product
  const filteredLogs = logs.filter(l => {
    if (logTypeFilter !== 'all' && l.type !== logTypeFilter) return false
    if (logProductFilter !== 'all' && l.productId !== logProductFilter) return false
    if (logDateFrom) {
      const from = new Date(logDateFrom)
      from.setHours(0, 0, 0, 0)
      if (l.createdAt < from) return false
    }
    if (logDateTo) {
      const to = new Date(logDateTo)
      to.setHours(23, 59, 59, 999)
      if (l.createdAt > to) return false
    }
    return true
  })

  // Log summary stats
  const logStats = useMemo(() => {
    const stockInTotal = filteredLogs.filter(l => l.type === 'stock_in').reduce((a, l) => a + Math.abs(l.changeQuantity), 0)
    const stockOutTotal = filteredLogs.filter(l => l.type === 'stock_out').reduce((a, l) => a + Math.abs(l.changeQuantity), 0)
    const damageTotal = filteredLogs.filter(l => l.type === 'damage').reduce((a, l) => a + Math.abs(l.changeQuantity), 0)
    return { stockInTotal, stockOutTotal, damageTotal, totalMovements: filteredLogs.length }
  }, [filteredLogs])

  // Unique products in logs for product filter dropdown
  const logProductNames = useMemo(() => {
    const map = new Map<string, string>()
    logs.forEach(l => map.set(l.productId, l.productName))
    return Array.from(map.entries())
  }, [logs])

  // Max category value for bar sizing
  const maxCatValue = categoryValuation.length > 0 ? categoryValuation[0].value : 1

  // Stocktake summary
  const stocktakeSummary = useMemo(() => {
    const counted = stocktakeRows.filter(r => r.status !== 'pending').length
    const matched = stocktakeRows.filter(r => r.status === 'matched').length
    const mismatched = stocktakeRows.filter(r => r.status === 'mismatch').length
    const totalVariance = stocktakeRows.reduce((a, r) => a + Math.abs(r.variance), 0)
    return { counted, matched, mismatched, totalVariance, total: stocktakeRows.length }
  }, [stocktakeRows])

  return (
    <div className="space-y-4 pb-16">
      {/* Top Header Card */}
      <div className="bg-telegram-secondary-bg rounded-2xl p-4 space-y-4 shadow-sm border border-telegram-hint/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-telegram-button/10 rounded-2xl flex items-center justify-center text-telegram-button">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-telegram-text">Smart Inventory & QR Manager</h2>
              <p className="text-xs text-telegram-hint">Real-time stock tracking, QR barcodes & audit log analytics</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartNativeScan}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-telegram-button text-telegram-button-text px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR</span>
            </button>
            <button
              onClick={exportInventoryCSV}
              className="p-2.5 bg-telegram-bg text-telegram-text border border-telegram-hint/20 rounded-xl hover:border-telegram-button text-xs font-semibold flex items-center space-x-1"
              title="Export CSV Report"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="p-2.5 bg-telegram-bg text-telegram-text border border-telegram-hint/20 rounded-xl hover:border-telegram-button text-xs font-semibold flex items-center space-x-1"
              title="Import CSV Stock Update"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Analytics Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="bg-telegram-bg p-3 rounded-xl border border-telegram-hint/15 space-y-1">
            <div className="flex items-center justify-between text-telegram-hint text-xs font-medium">
              <span>Total Valuation</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base font-extrabold text-telegram-text">${totalValuation.toFixed(2)}</div>
            <div className="text-[10px] text-telegram-hint">{products.length} unique products</div>
          </div>

          <div className="bg-telegram-bg p-3 rounded-xl border border-telegram-hint/15 space-y-1">
            <div className="flex items-center justify-between text-telegram-hint text-xs font-medium">
              <span>Total Stock</span>
              <Package className="w-4 h-4 text-telegram-button" />
            </div>
            <div className="text-base font-extrabold text-telegram-text">{totalItemsCount} units</div>
            <div className="text-[10px] text-telegram-hint">avg {avgStockPerProduct}/product</div>
          </div>

          <div className="bg-telegram-bg p-3 rounded-xl border border-telegram-hint/15 space-y-1">
            <div className="flex items-center justify-between text-telegram-hint text-xs font-medium">
              <span>Low Stock</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-extrabold text-amber-500">{lowStockCount} items</div>
            <div className="text-[10px] text-amber-600 font-medium">needs restock</div>
          </div>

          <div className="bg-telegram-bg p-3 rounded-xl border border-telegram-hint/15 space-y-1">
            <div className="flex items-center justify-between text-telegram-hint text-xs font-medium">
              <span>Out of Stock</span>
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-base font-extrabold text-red-500">{outOfStockCount} items</div>
            <div className="text-[10px] text-red-600 font-medium">zero inventory</div>
          </div>
        </div>

        {/* Profit Margin Summary Row */}
        {totalCostValue > 0 && (
          <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-3 rounded-xl border border-violet-300/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Percent className="w-4 h-4 text-violet-500" />
              <div>
                <div className="text-xs font-bold text-telegram-text">Potential Profit Margin</div>
                <div className="text-[10px] text-telegram-hint">Based on cost vs. retail price</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-extrabold text-violet-600">${totalPotentialProfit.toFixed(2)}</div>
              <div className="text-[10px] text-violet-500 font-bold">
                {totalValuation > 0 ? ((totalPotentialProfit / totalValuation) * 100).toFixed(1) : 0}% margin
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex overflow-x-auto border-b border-telegram-hint/20 pt-2 -mx-1 scrollbar-hide">
          {[
            { key: 'stock', label: 'Stock', icon: Package, count: filteredProducts.length },
            { key: 'reorder', label: 'Reorder', icon: Truck, count: reorderSuggestions.length },
            { key: 'stocktake', label: 'Stocktake', icon: ClipboardList },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 },
            { key: 'batch_labels', label: 'Labels', icon: Printer },
            { key: 'logs', label: 'Audit', icon: History },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-medium text-xs whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-telegram-button text-telegram-button font-bold'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab.key === 'reorder' && tab.count > 0 ? 'bg-red-100 text-red-700' : 'bg-telegram-hint/15 text-telegram-hint'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Global Toast Notification */}
      {message && (
        <div className={`p-3 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in ${
          message.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
            : 'bg-red-50 border border-red-300 text-red-900'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span className="font-medium text-xs sm:text-sm">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Web Camera Scanner Modal Overlay */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-telegram-bg rounded-2xl p-4 max-w-md w-full space-y-4 shadow-xl border border-telegram-hint/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-telegram-text">Point Camera at Product QR Code</h3>
              <button 
                onClick={() => {
                  if (scannerRef.current) scannerRef.current.clear()
                  setShowScanner(false)
                }}
                className="text-telegram-hint hover:text-telegram-text p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div id="qr-reader" className="w-full rounded-xl overflow-hidden border border-telegram-hint/30"></div>
            <p className="text-xs text-telegram-hint text-center">
              Position QR code inside scanner target to automatically open product controls.
            </p>
          </div>
        </div>
      )}

      {/* ============ TAB 1: Stock Control View ============ */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Selected Product Single Adjust Form */}
          {selectedProduct && (
            <div className="bg-telegram-secondary-bg border-2 border-telegram-button/40 rounded-2xl p-4 space-y-4 shadow-md animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex space-x-3">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img 
                      src={selectedProduct.images[0]} 
                      alt={selectedProduct.name} 
                      className="w-14 h-14 object-cover rounded-xl border border-telegram-hint/20" 
                    />
                  ) : (
                    <div className="w-14 h-14 bg-telegram-hint/10 rounded-xl flex items-center justify-center text-telegram-hint">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-telegram-text text-base">{selectedProduct.name}</h3>
                    <p className="text-xs text-telegram-hint">
                      SKU: <span className="font-mono font-semibold">{selectedProduct.sku || 'N/A'}</span> | Price: ${selectedProduct.price.toFixed(2)}
                      {selectedProduct.costPrice ? ` | Cost: $${selectedProduct.costPrice.toFixed(2)}` : ''}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-xs text-telegram-hint font-medium">Current Stock:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        selectedProduct.stock <= (selectedProduct.lowStockAlert || 5)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedProduct.stock} units
                      </span>
                    </div>
                    {selectedProduct.costPrice && selectedProduct.costPrice > 0 && (
                      <div className="mt-1">
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                          {(((selectedProduct.price - selectedProduct.costPrice) / selectedProduct.price) * 100).toFixed(1)}% margin
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => handlePrintLabel(selectedProduct)}
                    className="p-2 text-telegram-button hover:bg-telegram-button/10 rounded-xl transition-colors"
                    title="Print QR Label"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 text-telegram-hint hover:text-telegram-text rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Adjust Stock Form */}
              <div className="bg-telegram-bg rounded-xl p-3.5 space-y-3 border border-telegram-hint/20">
                <h4 className="text-xs font-bold text-telegram-text uppercase tracking-wider">Adjust Stock Level</h4>
                
                {/* Action Type Select */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdjustType('stock_in')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border text-center transition-all ${
                      adjustType === 'stock_in'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    + Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('stock_out')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border text-center transition-all ${
                      adjustType === 'stock_out'
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    - Stock Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border text-center transition-all ${
                      adjustType === 'adjustment'
                        ? 'bg-telegram-button text-telegram-button-text border-telegram-button shadow-sm'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    Set Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('damage')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border text-center transition-all ${
                      adjustType === 'damage'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    Damage/Loss
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-telegram-hint font-medium">Quantity adjustment:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setStockChangeQty(Math.max(1, stockChangeQty - 1))}
                      className="p-2 bg-telegram-secondary-bg text-telegram-text rounded-xl border border-telegram-hint/30 hover:opacity-80 active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={stockChangeQty}
                      onChange={(e) => setStockChangeQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center py-1.5 border border-telegram-hint/30 rounded-xl bg-telegram-bg text-telegram-text font-black text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setStockChangeQty(stockChangeQty + 1)}
                      className="p-2 bg-telegram-secondary-bg text-telegram-text rounded-xl border border-telegram-hint/30 hover:opacity-80 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <input
                    type="text"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="Reason/Notes (e.g. Restock batch #402 from supplier)"
                    className="w-full px-3 py-2 text-xs border border-telegram-hint/30 rounded-xl bg-telegram-bg text-telegram-text focus:outline-none focus:border-telegram-button"
                  />
                </div>

                {/* Confirm Save Button */}
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  disabled={saving}
                  className="w-full bg-telegram-button text-telegram-button-text py-2.5 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving Adjustment...' : 'Confirm Stock Adjustment'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter & Controls Toolbar */}
          <div className="bg-telegram-secondary-bg p-3 rounded-2xl space-y-3 border border-telegram-hint/10">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-telegram-hint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name or SKU..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-telegram-hint/30 rounded-xl bg-telegram-bg text-telegram-text focus:outline-none focus:border-telegram-button"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="low_stock">⚠️ Low Stock</option>
                <option value="out_of_stock">🚫 Out of Stock</option>
                <option value="in_stock">✅ In Stock</option>
              </select>

              {/* Category Filter */}
              {categoriesList.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
              >
                <option value="stock_asc">Stock ↑</option>
                <option value="stock_desc">Stock ↓</option>
                <option value="name">Name A-Z</option>
                <option value="value_desc">Value $</option>
                <option value="margin_desc">Margin %</option>
              </select>
            </div>

            {/* Bulk Action Controls Toolbar */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-telegram-hint/15">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-1.5 text-telegram-hint hover:text-telegram-text font-medium"
                >
                  {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-telegram-button" />
                  ) : (
                    <Square className="w-4 h-4 text-telegram-hint" />
                  )}
                  <span>Select ({selectedProductIds.length}/{filteredProducts.length})</span>
                </button>

                <button
                  onClick={startStocktake}
                  className="flex items-center space-x-1 text-telegram-hint hover:text-telegram-button font-medium"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Stocktake</span>
                </button>
              </div>

              {selectedProductIds.length > 0 && (
                <div className="flex items-center space-x-2 animate-fade-in">
                  <button
                    onClick={() => setShowBulkAdjustModal(true)}
                    className="bg-telegram-button text-telegram-button-text px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 shadow-sm active:scale-95"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Bulk Adjust ({selectedProductIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Product Inventory Items List */}
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="bg-telegram-secondary-bg rounded-2xl p-8 text-center text-telegram-hint text-sm border border-telegram-hint/10">
                No inventory products found matching your filters.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isLowStock = (p.stock || 0) <= (p.lowStockAlert || 5) && (p.stock || 0) > 0
                const isOutOfStock = (p.stock || 0) <= 0
                const isChecked = selectedProductIds.includes(p.id)
                const isSelected = selectedProduct?.id === p.id
                const profitMargin = p.costPrice && p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100) : null
                const isQuickAdjusting = quickAdjustingId === p.id

                return (
                  <div
                    key={p.id}
                    className={`bg-telegram-secondary-bg rounded-2xl p-3 border transition-all ${
                      isSelected
                        ? 'border-telegram-button ring-2 ring-telegram-button/30 shadow-md'
                        : isChecked
                        ? 'border-telegram-button/50 bg-telegram-button/5'
                        : 'border-telegram-hint/10 hover:border-telegram-hint/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <button 
                          onClick={() => toggleSelectProduct(p.id)}
                          className="p-1 hover:opacity-80 text-telegram-hint flex-shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-telegram-button" />
                          ) : (
                            <Square className="w-5 h-5 text-telegram-hint/60" />
                          )}
                        </button>

                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-xl border border-telegram-hint/20 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-telegram-hint/10 rounded-xl flex items-center justify-center text-telegram-hint flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-telegram-text truncate">{p.name}</h4>
                          <p className="text-xs text-telegram-hint">
                            SKU: <span className="font-mono">{p.sku || 'N/A'}</span> | ${p.price.toFixed(2)}
                          </p>
                          <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap">
                            {p.category && (
                              <span className="text-[10px] bg-telegram-hint/10 text-telegram-hint px-2 py-0.5 rounded-full">
                                {p.category}
                              </span>
                            )}
                            {profitMargin !== null && (
                              <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">
                                {profitMargin.toFixed(0)}% margin
                              </span>
                            )}
                            {/* Low stock alert threshold */}
                            {editingAlertId === p.id ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={editAlertValue}
                                  onChange={(e) => setEditAlertValue(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-12 px-1 py-0.5 text-[10px] border border-telegram-hint/30 rounded bg-telegram-bg text-telegram-text text-center"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveAlertThreshold(p)} className="text-emerald-500 hover:text-emerald-700">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingAlertId(null)} className="text-red-400 hover:text-red-600">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingAlertId(p.id); setEditAlertValue(p.lowStockAlert || 5) }}
                                className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full hover:bg-amber-100 flex items-center space-x-0.5"
                                title="Edit low stock alert threshold"
                              >
                                <Bell className="w-2.5 h-2.5" />
                                <span>Alert: {p.lowStockAlert || 5}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {/* Quick -1/+1 buttons */}
                        <button
                          onClick={() => handleQuickAdjust(p, -1)}
                          disabled={isQuickAdjusting || (p.stock || 0) <= 0}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 active:scale-95 disabled:opacity-30 transition-all"
                          title="Quick -1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold min-w-[60px] text-center ${
                          isOutOfStock 
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : isLowStock 
                            ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.stock || 0}
                        </span>

                        <button
                          onClick={() => handleQuickAdjust(p, 1)}
                          disabled={isQuickAdjusting}
                          className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg hover:bg-emerald-100 active:scale-95 disabled:opacity-30 transition-all"
                          title="Quick +1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="p-2 bg-telegram-button/10 text-telegram-button rounded-xl hover:bg-telegram-button/20 active:scale-95 transition-all"
                          title="Adjust Stock"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePrintLabel(p)}
                          className="p-2 bg-telegram-hint/10 text-telegram-hint hover:text-telegram-text rounded-xl active:scale-95 transition-all"
                          title="View QR Label"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ============ TAB: Reorder Suggestions ============ */}
      {activeTab === 'reorder' && (
        <div className="space-y-4">
          <div className="bg-telegram-secondary-bg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-telegram-text text-sm flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-telegram-button" />
                  <span>Reorder Suggestions</span>
                </h3>
                <p className="text-xs text-telegram-hint mt-0.5">Products at or below their low stock alert threshold</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                {reorderSuggestions.length} items
              </span>
            </div>

            {reorderSuggestions.length === 0 ? (
              <div className="p-8 text-center text-telegram-hint text-sm">
                <Check className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="font-medium">All products are well stocked!</p>
                <p className="text-xs mt-1">No reorder suggestions at this time.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reorderSuggestions.map(item => (
                  <div
                    key={item.id}
                    className={`bg-telegram-bg rounded-xl p-3 border ${
                      item.urgency === 'critical' ? 'border-red-300 bg-red-50/30' : 'border-amber-300 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          item.urgency === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {item.urgency === 'critical' ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-telegram-text truncate">{item.name}</h4>
                          <p className="text-[11px] text-telegram-hint">
                            SKU: {item.sku || 'N/A'} · Alert: ≤{item.lowStockAlert || 5}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-extrabold ${item.urgency === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                            {item.stock || 0} left
                          </div>
                          <div className="text-[10px] text-telegram-hint">
                            Suggest: +{item.suggestedQty}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProduct(item)
                            setStockChangeQty(item.suggestedQty)
                            setAdjustType('stock_in')
                            setActiveTab('stock')
                          }}
                          className="bg-telegram-button text-telegram-button-text px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB: Stocktake Mode ============ */}
      {activeTab === 'stocktake' && (
        <div className="space-y-4">
          {!stocktakeActive ? (
            <div className="bg-telegram-secondary-bg rounded-2xl p-6 text-center border border-telegram-hint/10 space-y-4">
              <div className="w-16 h-16 mx-auto bg-telegram-button/10 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-telegram-button" />
              </div>
              <div>
                <h3 className="font-bold text-telegram-text text-lg">Physical Stocktake</h3>
                <p className="text-xs text-telegram-hint mt-1 max-w-sm mx-auto">
                  Count your physical inventory and compare with system records. 
                  Variances will be highlighted and can be applied to update stock levels.
                </p>
              </div>
              <button
                onClick={startStocktake}
                className="bg-telegram-button text-telegram-button-text px-6 py-3 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center space-x-2 mx-auto"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Start New Stocktake ({filteredProducts.length} items)</span>
              </button>
            </div>
          ) : (
            <>
              {/* Stocktake Header & Summary */}
              <div className="bg-telegram-secondary-bg rounded-2xl p-4 border border-telegram-hint/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-telegram-text text-sm">Active Stocktake</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleStocktakeQrScan}
                      className="flex items-center space-x-1 bg-telegram-button/10 text-telegram-button px-3 py-1.5 rounded-xl text-xs font-bold"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan & Count</span>
                    </button>
                    <button
                      onClick={() => { setStocktakeActive(false); setStocktakeRows([]) }}
                      className="text-xs text-red-500 font-medium hover:text-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-telegram-bg p-2 rounded-xl text-center">
                    <div className="text-lg font-extrabold text-telegram-text">{stocktakeSummary.counted}</div>
                    <div className="text-[10px] text-telegram-hint">Counted</div>
                  </div>
                  <div className="bg-telegram-bg p-2 rounded-xl text-center">
                    <div className="text-lg font-extrabold text-emerald-600">{stocktakeSummary.matched}</div>
                    <div className="text-[10px] text-telegram-hint">Matched</div>
                  </div>
                  <div className="bg-telegram-bg p-2 rounded-xl text-center">
                    <div className="text-lg font-extrabold text-red-600">{stocktakeSummary.mismatched}</div>
                    <div className="text-[10px] text-telegram-hint">Variance</div>
                  </div>
                  <div className="bg-telegram-bg p-2 rounded-xl text-center">
                    <div className="text-lg font-extrabold text-telegram-hint">{stocktakeSummary.total - stocktakeSummary.counted}</div>
                    <div className="text-[10px] text-telegram-hint">Pending</div>
                  </div>
                </div>
              </div>

              {/* Stocktake Product Rows */}
              <div className="space-y-2">
                {stocktakeRows.map(row => (
                  <div
                    key={row.productId}
                    className={`bg-telegram-secondary-bg rounded-xl p-3 border transition-all ${
                      row.status === 'matched' ? 'border-emerald-300 bg-emerald-50/20' :
                      row.status === 'mismatch' ? 'border-red-300 bg-red-50/20' :
                      'border-telegram-hint/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-telegram-text truncate">{row.productName}</h4>
                        <p className="text-[11px] text-telegram-hint">
                          SKU: {row.sku || 'N/A'} · System: <strong>{row.systemStock}</strong>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateStocktakeCount(row.productId, Math.max(0, (row.countedStock ?? 0) - 1))}
                            className="p-1 bg-telegram-hint/10 rounded-lg text-telegram-hint hover:text-telegram-text active:scale-95"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={row.countedStock ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0)
                              updateStocktakeCount(row.productId, val)
                            }}
                            placeholder="—"
                            className="w-16 text-center py-1 border border-telegram-hint/30 rounded-lg bg-telegram-bg text-telegram-text font-bold text-sm"
                          />
                          <button
                            onClick={() => updateStocktakeCount(row.productId, (row.countedStock ?? 0) + 1)}
                            className="p-1 bg-telegram-hint/10 rounded-lg text-telegram-hint hover:text-telegram-text active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {row.status === 'matched' && (
                          <span className="text-emerald-600 text-xs font-bold flex items-center space-x-0.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>OK</span>
                          </span>
                        )}
                        {row.status === 'mismatch' && (
                          <span className={`text-xs font-bold ${row.variance > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {row.variance > 0 ? '+' : ''}{row.variance}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apply Stocktake Button */}
              {stocktakeSummary.mismatched > 0 && (
                <button
                  onClick={applyStocktakeResults}
                  disabled={stocktakeSaving}
                  className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-xl text-sm font-bold shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{stocktakeSaving ? 'Applying Stocktake...' : `Apply ${stocktakeSummary.mismatched} Variance Adjustments`}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ TAB: Analytics ============ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Category Valuation Breakdown */}
          <div className="bg-telegram-secondary-bg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-telegram-text text-sm flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-telegram-button" />
                <span>Stock Value by Category</span>
              </h3>
            </div>

            <div className="space-y-2">
              {categoryValuation.map((cat, idx) => {
                const barWidth = maxCatValue > 0 ? (cat.value / maxCatValue) * 100 : 0
                const colors = [
                  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 
                  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500'
                ]
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-telegram-text truncate">{cat.name}</span>
                      <span className="text-telegram-hint font-mono">${cat.value.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-telegram-hint/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[idx % colors.length]} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-telegram-hint">
                      <span>{cat.count} products</span>
                      <span>{cat.stock} units</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stock Health Overview */}
          <div className="bg-telegram-secondary-bg rounded-2xl p-4 border border-telegram-hint/10">
            <h3 className="font-bold text-telegram-text text-sm mb-3 flex items-center space-x-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Inventory Health Score</span>
            </h3>

            {(() => {
              const healthyCount = products.filter(p => (p.stock || 0) > (p.lowStockAlert || 5)).length
              const healthScore = products.length > 0 ? Math.round((healthyCount / products.length) * 100) : 100
              const scoreColor = healthScore >= 80 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
              const scoreLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 50 ? 'Needs Attention' : 'Critical'

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-3xl font-black ${scoreColor}`}>{healthScore}%</div>
                      <div className={`text-xs font-bold ${scoreColor}`}>{scoreLabel}</div>
                    </div>
                    <div className="text-right text-xs text-telegram-hint space-y-1">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>{healthyCount} healthy</span>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>{lowStockCount} low stock</span>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                        <span>{outOfStockCount} out of stock</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual health bar */}
                  <div className="w-full h-4 rounded-full overflow-hidden flex bg-telegram-hint/10">
                    {products.length > 0 && (
                      <>
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(healthyCount / products.length) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{ width: `${(lowStockCount / products.length) * 100}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(outOfStockCount / products.length) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Top Items by Value */}
          <div className="bg-telegram-secondary-bg rounded-2xl p-4 border border-telegram-hint/10">
            <h3 className="font-bold text-telegram-text text-sm mb-3 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Top 5 Products by Stock Value</span>
            </h3>

            <div className="space-y-2">
              {[...products]
                .sort((a, b) => ((b.stock || 0) * (b.price || 0)) - ((a.stock || 0) * (a.price || 0)))
                .slice(0, 5)
                .map((p, idx) => {
                  const value = (p.stock || 0) * (p.price || 0)
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-telegram-bg p-2.5 rounded-xl border border-telegram-hint/10">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-xs font-bold text-telegram-hint w-5 text-center flex-shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-telegram-text truncate">{p.name}</div>
                          <div className="text-[10px] text-telegram-hint">{p.stock || 0} × ${p.price.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-emerald-600 flex-shrink-0">${value.toFixed(2)}</div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: Batch QR Code Labels Sheet ============ */}
      {activeTab === 'batch_labels' && (
        <div className="space-y-4">
          <div className="bg-telegram-secondary-bg rounded-2xl p-4 flex items-center justify-between border border-telegram-hint/10">
            <div>
              <h3 className="font-bold text-telegram-text text-sm">Batch QR Code Printable Labels</h3>
              <p className="text-xs text-telegram-hint">Select items to print multi-label sheets for inventory tagging</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet</span>
            </button>
          </div>

          <div id="printable-batch-sheet" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => (
              <div key={prod.id} className="bg-white text-black p-3 rounded-xl border border-gray-300 shadow-sm text-center space-y-1">
                <div className="font-bold text-xs truncate">{prod.name}</div>
                <div className="text-[10px] text-gray-500 font-mono">SKU: {prod.sku || prod.id.slice(0, 8)}</div>
                <div className="flex justify-center py-1">
                  <QRCodeSVG value={`woodshop:product:${prod.id}`} size={110} level="M" includeMargin={true} />
                </div>
                <div className="font-extrabold text-sm text-gray-900">${prod.price.toFixed(2)}</div>
                <div className="text-[9px] text-gray-400 uppercase tracking-widest">{shop.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ TAB: Audit History Log View ============ */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {/* Log Filters */}
          <div className="bg-telegram-secondary-bg rounded-2xl p-3 border border-telegram-hint/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-telegram-text flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-telegram-button" />
                <span>Filter Audit History</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportLogsCSV}
                  className="flex items-center space-x-1 text-xs text-telegram-button font-bold hover:opacity-80"
                  title="Export audit logs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <button onClick={fetchLogs} className="flex items-center space-x-1 text-telegram-button font-bold text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
              >
                <option value="all">All Movements</option>
                <option value="stock_in">Stock In (+)</option>
                <option value="stock_out">Stock Out (-)</option>
                <option value="adjustment">Adjustment (=)</option>
                <option value="damage">Loss & Damage</option>
              </select>

              <select
                value={logProductFilter}
                onChange={(e) => setLogProductFilter(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
              >
                <option value="all">All Products</option>
                {logProductNames.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>

              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={(e) => setLogDateFrom(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
                  placeholder="From"
                />
                <span className="text-telegram-hint text-xs">→</span>
                <input
                  type="date"
                  value={logDateTo}
                  onChange={(e) => setLogDateTo(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-xl border border-telegram-hint/30 bg-telegram-bg text-telegram-text focus:outline-none"
                  placeholder="To"
                />
              </div>

              {(logDateFrom || logDateTo || logProductFilter !== 'all' || logTypeFilter !== 'all') && (
                <button
                  onClick={() => { setLogTypeFilter('all'); setLogProductFilter('all'); setLogDateFrom(''); setLogDateTo('') }}
                  className="text-xs text-red-500 font-medium flex items-center space-x-1 hover:text-red-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Log Summary Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-telegram-secondary-bg p-2.5 rounded-xl text-center border border-telegram-hint/10">
              <div className="text-lg font-extrabold text-telegram-text">{logStats.totalMovements}</div>
              <div className="text-[10px] text-telegram-hint">Movements</div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-200">
              <div className="text-lg font-extrabold text-emerald-600">+{logStats.stockInTotal}</div>
              <div className="text-[10px] text-emerald-600">Stock In</div>
            </div>
            <div className="bg-orange-50 p-2.5 rounded-xl text-center border border-orange-200">
              <div className="text-lg font-extrabold text-orange-600">-{logStats.stockOutTotal}</div>
              <div className="text-[10px] text-orange-600">Stock Out</div>
            </div>
            <div className="bg-red-50 p-2.5 rounded-xl text-center border border-red-200">
              <div className="text-lg font-extrabold text-red-600">-{logStats.damageTotal}</div>
              <div className="text-[10px] text-red-600">Damage</div>
            </div>
          </div>

          {logsLoading ? (
            <div className="py-8 text-center text-telegram-hint text-sm">Loading audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-telegram-secondary-bg rounded-2xl p-6 text-center text-telegram-hint text-sm border border-telegram-hint/10">
              No stock movement audit records found for the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const isPositive = log.changeQuantity > 0

                return (
                  <div key={log.id} className="bg-telegram-secondary-bg rounded-2xl p-3.5 text-xs space-y-1.5 border border-telegram-hint/10">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-telegram-text text-sm">{log.productName}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-black ${
                        isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isPositive ? `+${log.changeQuantity}` : log.changeQuantity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-telegram-hint text-[11px]">
                      <span>Type: <strong className="capitalize text-telegram-text">{log.type.replace('_', ' ')}</strong></span>
                      <span>Stock shift: {log.previousStock} ➔ <strong className="text-telegram-text">{log.newStock}</strong></span>
                    </div>

                    {log.notes && (
                      <p className="text-telegram-hint italic bg-telegram-bg/50 p-1.5 rounded-lg border border-telegram-hint/10">
                        "{log.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-telegram-hint border-t border-telegram-hint/10 pt-1 text-[10px]">
                      <span>By: <strong>{log.performedBy}</strong></span>
                      <span>{log.createdAt.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bulk Stock Adjustment Modal */}
      {showBulkAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-telegram-bg rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl border border-telegram-hint/20">
            <div className="flex items-center justify-between border-b border-telegram-hint/20 pb-3">
              <h3 className="font-bold text-telegram-text text-base">Bulk Stock Update ({selectedProductIds.length} items)</h3>
              <button onClick={() => setShowBulkAdjustModal(false)} className="text-telegram-hint hover:text-telegram-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-telegram-hint font-medium block mb-1">Action Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBulkActionType('stock_in')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      bulkActionType === 'stock_in' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-telegram-secondary-bg text-telegram-text'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkActionType('stock_out')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      bulkActionType === 'stock_out' ? 'bg-orange-600 text-white border-orange-600' : 'bg-telegram-secondary-bg text-telegram-text'
                    }`}
                  >
                    - Deduct Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkActionType('set_stock')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      bulkActionType === 'set_stock' ? 'bg-telegram-button text-telegram-button-text border-telegram-button' : 'bg-telegram-secondary-bg text-telegram-text'
                    }`}
                  >
                    Set Fixed Count
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-telegram-hint font-medium block mb-1">Quantity Value</label>
                <input
                  type="number"
                  min="1"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-telegram-hint/30 rounded-xl bg-telegram-bg text-telegram-text font-bold"
                />
              </div>

              <button
                type="button"
                onClick={handleBulkAdjust}
                disabled={saving}
                className="w-full bg-telegram-button text-telegram-button-text py-2.5 rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 shadow-sm transition-all"
              >
                {saving ? 'Processing Bulk Update...' : 'Apply Bulk Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-telegram-bg rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl border border-telegram-hint/20">
            <div className="flex items-center justify-between border-b border-telegram-hint/20 pb-3">
              <h3 className="font-bold text-telegram-text text-base">Import Inventory CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-telegram-hint hover:text-telegram-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-telegram-hint">
                Upload a CSV file containing columns: <code className="bg-telegram-secondary-bg px-1 py-0.5 rounded font-mono">sku</code> or <code className="bg-telegram-secondary-bg px-1 py-0.5 rounded font-mono">id</code>, and <code className="bg-telegram-secondary-bg px-1 py-0.5 rounded font-mono">stock</code>.
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-telegram-hint/30 rounded-xl bg-telegram-secondary-bg text-telegram-text"
              />

              <button
                type="button"
                onClick={handleImportCSV}
                disabled={!importFile || importing}
                className="w-full bg-telegram-button text-telegram-button-text py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
              >
                {importing ? 'Processing Import...' : 'Import CSV Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Product QR Code Label Print Modal */}
      {showLabelModal && labelProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-telegram-bg rounded-2xl p-6 max-w-sm w-full space-y-4 text-center border border-telegram-hint/20 shadow-2xl">
            <div className="flex justify-between items-center border-b border-telegram-hint/20 pb-3">
              <h3 className="font-bold text-telegram-text text-base">Product QR Label</h3>
              <button 
                onClick={() => setShowLabelModal(false)}
                className="text-telegram-hint hover:text-telegram-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Label Card */}
            <div id="printable-label" className="bg-white text-black p-4 rounded-xl border-2 border-gray-300 shadow-sm space-y-2">
              <div className="font-bold text-base truncate">{labelProduct.name}</div>
              <div className="text-xs text-gray-600 font-mono">
                SKU: {labelProduct.sku || labelProduct.id.slice(0, 10)}
              </div>
              
              <div className="flex justify-center py-2">
                <QRCodeSVG 
                  value={`woodshop:product:${labelProduct.id}`} 
                  size={150} 
                  level="H" 
                  includeMargin={true}
                />
              </div>

              <div className="font-extrabold text-xl text-gray-900">
                ${labelProduct.price.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                {shop.name}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={printCurrentLabel}
                className="flex-1 bg-telegram-button text-telegram-button-text py-2.5 rounded-xl text-sm font-bold flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label</span>
              </button>
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2.5 bg-telegram-hint/20 text-telegram-text rounded-xl text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
