import React, { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { 
  collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, limit 
} from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { Product, Shop, InventoryLog } from '../../types'
import { 
  QrCode, Camera, Plus, Minus, RefreshCw, Printer, Search, AlertTriangle, 
  History, ArrowUpRight, ArrowDownRight, Package, Check, X, Sliders 
} from 'lucide-react'

interface InventoryManagerProps {
  shop: Shop
  products: Product[]
  onRefreshProducts: () => void
  performedBy: string
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  shop,
  products,
  onRefreshProducts,
  performedBy
}) => {
  const { db } = useFirebase()
  const [activeTab, setActiveTab] = useState<'stock' | 'logs' | 'labels'>('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  
  // Selected product for adjustment / QR view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockChangeQty, setStockChangeQty] = useState<number>(1)
  const [adjustType, setAdjustType] = useState<'stock_in' | 'stock_out' | 'adjustment' | 'damage'>('stock_in')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // QR Scanning State
  const [showScanner, setShowScanner] = useState(false)
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Label Printing Modal State
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelProduct, setLabelProduct] = useState<Product | null>(null)

  // Inventory Logs State
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Load Inventory Logs
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [activeTab, shop.id])

  // Initialize Web Camera QR Scanner when showScanner is true
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
          console.log('QR Code scanned:', decodedText)
          handleQrScanned(decodedText)
          scanner.clear()
          setShowScanner(false)
        },
        (error) => {
          // Ignore scanning frame errors
        }
      )

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error('Error clearing scanner:', err))
        }
      }
    }
  }, [showScanner])

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const logsRef = collection(db, 'inventory_logs')
      const q = query(
        logsRef,
        where('shopId', '==', shop.id)
      )
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

      // Sort client-side by date desc
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setLogs(list)
    } catch (err) {
      console.error('Error fetching inventory logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  // Handle scanned QR code value (Format expected: `woodshop:product:ID` or raw ID or SKU)
  const handleQrScanned = (scannedData: string) => {
    setScannedResult(scannedData)
    
    // Extract ID if formatted as woodshop:product:ID
    let targetId = scannedData.trim()
    if (targetId.startsWith('woodshop:product:')) {
      targetId = targetId.replace('woodshop:product:', '')
    }

    // Match product by ID or SKU
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

  // Save Inventory Adjustment
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

      // Update product document in Firestore
      const productRef = doc(db, 'products', selectedProduct.id)
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: new Date()
      })

      // Add to inventory_logs collection
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

      // Update local product state
      setSelectedProduct({
        ...selectedProduct,
        stock: newStock
      })

      // Reset form fields
      setAdjustNotes('')
      onRefreshProducts()
    } catch (err: any) {
      console.error('Error saving inventory adjustment:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to update inventory stock.' })
    } finally {
      setSaving(false)
    }
  }

  // Print Label Handler
  const handlePrintLabel = (product: Product) => {
    setLabelProduct(product)
    setShowLabelModal(true)
  }

  const printCurrentLabel = () => {
    window.print()
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesLowStock = filterLowStock ? (p.stock <= (p.lowStockAlert || 5)) : true

    return matchesSearch && matchesLowStock
  })

  return (
    <div className="space-y-4">
      {/* Header & Mode Selector */}
      <div className="bg-telegram-secondary-bg rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-telegram-button" />
            <div>
              <h2 className="text-lg font-bold text-telegram-text">Inventory & QR Manager</h2>
              <p className="text-xs text-telegram-hint">Scan, track, and print QR codes for products</p>
            </div>
          </div>
          <button
            onClick={handleStartNativeScan}
            className="flex items-center space-x-1 bg-telegram-button text-telegram-button-text px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR</span>
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-telegram-hint/20">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'stock'
                ? 'border-telegram-button text-telegram-button'
                : 'border-transparent text-telegram-hint hover:text-telegram-text'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock Control</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'logs'
                ? 'border-telegram-button text-telegram-button'
                : 'border-transparent text-telegram-hint hover:text-telegram-text'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      {/* Global Toast Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-800' 
            : 'bg-red-100 border border-red-400 text-red-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Web Camera Scanner Overlay */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-telegram-bg rounded-lg p-4 max-w-md w-full space-y-4">
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
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden border border-telegram-hint/30"></div>
            <p className="text-xs text-telegram-hint text-center">
              Scanning automatically detects the product and opens stock control.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: Stock Control View */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Selected Product Adjuster Modal / Card */}
          {selectedProduct && (
            <div className="bg-telegram-secondary-bg border-2 border-telegram-button/40 rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex space-x-3">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img 
                      src={selectedProduct.images[0]} 
                      alt={selectedProduct.name} 
                      className="w-14 h-14 object-cover rounded-lg border border-telegram-hint/20" 
                    />
                  ) : (
                    <div className="w-14 h-14 bg-telegram-hint/10 rounded-lg flex items-center justify-center text-telegram-hint">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-telegram-text">{selectedProduct.name}</h3>
                    <p className="text-xs text-telegram-hint">
                      SKU: <span className="font-mono">{selectedProduct.sku || 'N/A'}</span> | Price: ${selectedProduct.price.toFixed(2)}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-xs text-telegram-hint">Current Stock:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        selectedProduct.stock <= (selectedProduct.lowStockAlert || 5)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedProduct.stock} units
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => handlePrintLabel(selectedProduct)}
                    className="p-2 text-telegram-button hover:bg-telegram-button/10 rounded-lg"
                    title="Print QR Label"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 text-telegram-hint hover:text-telegram-text rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Adjust Stock Form */}
              <div className="bg-telegram-bg rounded-lg p-3 space-y-3 border border-telegram-hint/20">
                <h4 className="text-sm font-semibold text-telegram-text">Adjust Stock Level</h4>
                
                {/* Action Type */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('stock_in')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      adjustType === 'stock_in'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    + Stock In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('stock_out')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      adjustType === 'stock_out'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    - Stock Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      adjustType === 'adjustment'
                        ? 'bg-telegram-button text-telegram-button-text border-telegram-button'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    Set Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('damage')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      adjustType === 'damage'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-telegram-secondary-bg text-telegram-text border-telegram-hint/30'
                    }`}
                  >
                    Damage/Loss
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-telegram-hint font-medium">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setStockChangeQty(Math.max(1, stockChangeQty - 1))}
                      className="p-2 bg-telegram-secondary-bg text-telegram-text rounded-lg border border-telegram-hint/30 hover:opacity-80"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={stockChangeQty}
                      onChange={(e) => setStockChangeQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center py-1.5 border border-telegram-hint/30 rounded-lg bg-telegram-bg text-telegram-text font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setStockChangeQty(stockChangeQty + 1)}
                      className="p-2 bg-telegram-secondary-bg text-telegram-text rounded-lg border border-telegram-hint/30 hover:opacity-80"
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
                    placeholder="Reason/Notes (e.g. Restock batch #402)"
                    className="w-full px-3 py-1.5 text-xs border border-telegram-hint/30 rounded-lg bg-telegram-bg text-telegram-text focus:outline-none focus:border-telegram-button"
                  />
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  disabled={saving}
                  className="w-full bg-telegram-button text-telegram-button-text py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Confirm Stock Adjustment'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-telegram-hint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-telegram-hint/30 rounded-lg bg-telegram-bg text-telegram-text focus:outline-none focus:border-telegram-button"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center space-x-1.5 transition-colors ${
                filterLowStock
                  ? 'bg-red-100 text-red-800 border-red-400'
                  : 'bg-telegram-secondary-bg text-telegram-hint border-telegram-hint/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low Stock Only</span>
            </button>
          </div>

          {/* Product Inventory List */}
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="bg-telegram-secondary-bg rounded-lg p-6 text-center text-telegram-hint text-sm">
                No products found matching your search.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isLowStock = p.stock <= (p.lowStockAlert || 5)
                const isSelected = selectedProduct?.id === p.id

                return (
                  <div
                    key={p.id}
                    className={`bg-telegram-secondary-bg rounded-lg p-3 flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'border-telegram-button ring-1 ring-telegram-button'
                        : 'border-transparent hover:border-telegram-hint/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-telegram-hint/20" />
                      ) : (
                        <div className="w-10 h-10 bg-telegram-hint/10 rounded-lg flex items-center justify-center text-telegram-hint">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-telegram-text">{p.name}</h4>
                        <p className="text-xs text-telegram-hint">
                          {p.sku ? `SKU: ${p.sku}` : 'No SKU'} | Price: ${p.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isLowStock 
                          ? 'bg-red-100 text-red-800 border border-red-300' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {p.stock} in stock
                      </span>

                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="p-1.5 bg-telegram-button/10 text-telegram-button rounded-lg hover:bg-telegram-button/20"
                        title="Adjust Stock"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handlePrintLabel(p)}
                        className="p-1.5 bg-telegram-hint/10 text-telegram-hint hover:text-telegram-text rounded-lg"
                        title="View QR Label"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Audit History Log */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-telegram-hint px-1">
            <span>Showing recent stock movements</span>
            <button onClick={fetchLogs} className="flex items-center space-x-1 text-telegram-button">
              <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {logsLoading ? (
            <div className="py-8 text-center text-telegram-hint text-sm">Loading inventory logs...</div>
          ) : logs.length === 0 ? (
            <div className="bg-telegram-secondary-bg rounded-lg p-6 text-center text-telegram-hint text-sm">
              No inventory changes recorded yet. Adjust product stock to create audit logs.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const isPositive = log.changeQuantity > 0

                return (
                  <div key={log.id} className="bg-telegram-secondary-bg rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-telegram-text text-sm">{log.productName}</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isPositive ? `+${log.changeQuantity}` : log.changeQuantity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-telegram-hint">
                      <span>Type: <strong className="capitalize">{log.type.replace('_', ' ')}</strong></span>
                      <span>Stock: {log.previousStock} ➔ <strong>{log.newStock}</strong></span>
                    </div>

                    {log.notes && (
                      <p className="text-telegram-hint italic">"{log.notes}"</p>
                    )}

                    <div className="flex items-center justify-between text-telegram-hint border-t border-telegram-hint/10 pt-1 text-[11px]">
                      <span>By: {log.performedBy}</span>
                      <span>{log.createdAt.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* QR Code Label Print Modal */}
      {showLabelModal && labelProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-telegram-bg rounded-lg p-6 max-w-sm w-full space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-telegram-hint/20 pb-3">
              <h3 className="font-bold text-telegram-text">Product QR Label</h3>
              <button 
                onClick={() => setShowLabelModal(false)}
                className="text-telegram-hint hover:text-telegram-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Label Card */}
            <div id="printable-label" className="bg-white text-black p-4 rounded-lg border-2 border-gray-300 shadow-sm space-y-2">
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

              <div className="font-bold text-lg text-gray-900">
                ${labelProduct.price.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {shop.name}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={printCurrentLabel}
                className="flex-1 bg-telegram-button text-telegram-button-text py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label</span>
              </button>
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 bg-telegram-hint/20 text-telegram-text rounded-lg text-sm font-medium"
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
