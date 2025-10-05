import React, { useState, useEffect } from 'react'
import {
  X,
  Mail,
  Phone,
  User,
  Tag,
  MessageCircle,
  ShoppingBag,
  DollarSign,
  Calendar,
  Save,
  Plus,
  Download,
  Package
} from 'lucide-react'
import { CRMContact, CRMTag, Order } from '../../types'
import {
  updateContactTags,
  updateContactNotes,
  getTags,
  createTag
} from '../../services/crmService'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { format } from 'date-fns'

interface CRMContactDetailProps {
  contact: CRMContact
  onClose: () => void
  onSendMessage: (contact: CRMContact) => void
  onViewOrders?: (customerId: string) => void
  onUpdate: () => void
}

const CRMContactDetail: React.FC<CRMContactDetailProps> = ({
  contact,
  onClose,
  onSendMessage,
  onViewOrders,
  onUpdate
}) => {
  const [notes, setNotes] = useState(contact.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [availableTags, setAvailableTags] = useState<CRMTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(contact.tags || [])
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [showOrders, setShowOrders] = useState(false)

  useEffect(() => {
    loadTags()
    loadOrders()
  }, [contact.shopId])

  const loadTags = async () => {
    try {
      const tags = await getTags(contact.shopId)
      setAvailableTags(tags)
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const loadOrders = async () => {
    try {
      setLoadingOrders(true)
      const ordersRef = collection(db, 'orders')
      const ordersQuery = query(
        ordersRef,
        where('shopId', '==', contact.shopId),
        where('customerId', '==', contact.customerId),
        orderBy('createdAt', 'desc')
      )
      const ordersSnapshot = await getDocs(ordersQuery)

      const ordersList: Order[] = ordersSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          estimatedDeliveryTime: data.estimatedDeliveryTime?.toDate()
        } as Order
      })

      setOrders(ordersList)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const exportContactData = () => {
    const data = {
      contact: {
        name: contact.name,
        username: contact.username,
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags,
        notes: contact.notes,
        totalOrders: contact.totalOrders,
        totalSpent: contact.totalSpent,
        averageOrderValue: contact.averageOrderValue,
        lastOrderDate: contact.lastOrderDate?.toISOString()
      },
      orders: orders.map(order => ({
        id: order.id,
        date: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        items: order.items.map(item => ({
          product: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contact-${contact.name?.replace(/\s+/g, '-')}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true)
      await updateContactNotes(contact.id, notes)
      onUpdate()
      alert('Notes saved successfully')
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const toggleTag = async (tagName: string) => {
    try {
      const newTags = selectedTags.includes(tagName)
        ? selectedTags.filter(t => t !== tagName)
        : [...selectedTags, tagName]

      setSelectedTags(newTags)
      await updateContactTags(contact.id, newTags)
      onUpdate()
    } catch (error) {
      console.error('Error updating tags:', error)
      alert('Failed to update tags')
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      await createTag(contact.shopId, newTagName.trim(), newTagColor)
      await loadTags()
      setShowNewTag(false)
      setNewTagName('')
      setNewTagColor('#3B82F6')
    } catch (error) {
      console.error('Error creating tag:', error)
      alert('Failed to create tag')
    }
  }

  const characterCount = notes.length
  const maxChars = 500

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700'
      case 'shipped': return 'bg-blue-100 text-blue-700'
      case 'confirmed': return 'bg-purple-100 text-purple-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-telegram-bg rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-telegram-bg border-b border-telegram-hint/20 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-telegram-text">Contact Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportContactData}
              className="p-2 hover:bg-telegram-secondary-bg rounded-lg transition-colors"
              title="Export Contact Data"
            >
              <Download className="h-5 w-5 text-telegram-button" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-telegram-secondary-bg rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-telegram-hint" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-telegram-button rounded-full flex items-center justify-center text-telegram-button-text text-2xl font-semibold">
              {contact.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-telegram-text">
                {contact.name || 'Unknown User'}
              </h3>
              {contact.username && (
                <p className="text-telegram-hint">@{contact.username}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    contact.activityStatus === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-telegram-hint/20 text-telegram-hint'
                  }`}
                >
                  {contact.activityStatus === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact.email && (
              <div className="flex items-center gap-3 p-3 bg-telegram-secondary-bg rounded-lg">
                <Mail className="h-5 w-5 text-telegram-hint" />
                <div>
                  <p className="text-xs text-telegram-hint">Email</p>
                  <p className="text-sm font-medium text-telegram-text">
                    {contact.email}
                  </p>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3 p-3 bg-telegram-secondary-bg rounded-lg">
                <Phone className="h-5 w-5 text-telegram-hint" />
                <div>
                  <p className="text-xs text-telegram-hint">Phone</p>
                  <p className="text-sm font-medium text-telegram-text">
                    {contact.phone}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-telegram-secondary-bg p-4 rounded-lg border border-telegram-button/20">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-5 w-5 text-telegram-button" />
                <span className="text-xs text-telegram-hint">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-telegram-text">
                {contact.totalOrders}
              </p>
            </div>
            <div className="bg-telegram-secondary-bg p-4 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-xs text-telegram-hint">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-telegram-text">
                ${contact.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-telegram-secondary-bg p-4 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span className="text-xs text-telegram-hint">Avg Order</span>
              </div>
              <p className="text-2xl font-bold text-telegram-text">
                ${contact.averageOrderValue.toFixed(2)}
              </p>
            </div>
          </div>

          {contact.lastOrderDate && (
            <div className="flex items-center gap-2 text-sm text-telegram-hint">
              <Calendar className="h-4 w-4" />
              Last order: {contact.lastOrderDate.toLocaleDateString()}
            </div>
          )}

          {/* Order History Section */}
          <div className="border-t border-telegram-hint/20 pt-4">
            <button
              onClick={() => setShowOrders(!showOrders)}
              className="flex items-center justify-between w-full p-3 bg-telegram-secondary-bg rounded-lg hover:bg-telegram-hint/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-telegram-button" />
                <span className="font-medium text-telegram-text">Order History</span>
                <span className="text-xs text-telegram-hint">({orders.length})</span>
              </div>
              <span className="text-telegram-hint">{showOrders ? '▼' : '▶'}</span>
            </button>

            {showOrders && (
              <div className="mt-3 space-y-2">
                {loadingOrders ? (
                  <div className="text-center py-8 text-telegram-hint">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-telegram-hint">No orders yet</div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-telegram-secondary-bg rounded-lg p-3 border border-telegram-hint/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-telegram-text">
                            Order #{order.id.slice(-8)}
                          </p>
                          <p className="text-xs text-telegram-hint">
                            {format(order.createdAt, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-sm font-bold text-telegram-text">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-xs text-telegram-hint flex justify-between">
                            <span>{item.quantity}x {item.productName}</span>
                            <span>${item.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-telegram-text">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <button
                onClick={() => setShowNewTag(!showNewTag)}
                className="flex items-center gap-1 text-sm text-telegram-button hover:text-telegram-button/80"
              >
                <Plus className="h-4 w-4" />
                New Tag
              </button>
            </div>

            {showNewTag && (
              <div className="mb-3 p-3 bg-telegram-secondary-bg rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="flex-1 px-3 py-2 border border-telegram-hint/20 bg-telegram-bg rounded-lg focus:ring-2 focus:ring-telegram-button focus:border-transparent text-sm text-telegram-text"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-telegram-hint/20"
                  />
                  <button
                    onClick={handleCreateTag}
                    className="px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg hover:bg-telegram-button/90 text-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'text-white'
                      : 'bg-telegram-secondary-bg text-telegram-text hover:bg-telegram-hint/20'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.name)
                      ? tag.color
                      : undefined
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={maxChars}
              placeholder="Add notes about this customer..."
              className="w-full px-4 py-3 border border-telegram-hint/20 bg-telegram-bg text-telegram-text rounded-lg focus:ring-2 focus:ring-telegram-button focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-telegram-hint">
                {characterCount}/{maxChars} characters
              </span>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex items-center gap-2 px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg hover:bg-telegram-button/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Save className="h-4 w-4" />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onSendMessage(contact)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-telegram-button text-telegram-button-text rounded-lg hover:bg-telegram-button/90 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CRMContactDetail
