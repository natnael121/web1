import React, { useState } from 'react'
import { X, Save, Store, FileText, Image, Globe, Phone, Mail, MapPin, Clock } from 'lucide-react'
import ImageUpload from '../common/ImageUpload'

interface ShopCreateModalProps {
  userId: string
  onSave: (shop: any) => void
  onCancel: () => void
}

const ShopCreateModal: React.FC<ShopCreateModalProps> = ({ userId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
    businessInfo: {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: ''
    },
    settings: {
      currency: 'USD',
      taxRate: 0,
      businessHours: {
        open: '09:00',
        close: '18:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      orderSettings: {
        autoConfirm: false,
        requirePayment: false,
        allowCancellation: true
      }
    }
  })

  const [activeTab, setActiveTab] = useState<'basic' | 'business' | 'settings'>('basic')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Generate slug from name if not provided
    const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Shop name is required')
      return
    }
    
    if (!formData.description.trim()) {
      alert('Shop description is required')
      return
    }
    
    // Ensure all required nested objects exist
    const shopData = {
      name: formData.name.trim(),
      slug,
      description: formData.description.trim(),
      logo: formData.logo || '',
      ownerId: userId,
      isActive: true,
      businessInfo: {
        name: formData.businessInfo.name || '',
        description: formData.businessInfo.description || '',
        address: formData.businessInfo.address || '',
        phone: formData.businessInfo.phone || '',
        email: formData.businessInfo.email || '',
        website: formData.businessInfo.website || ''
      },
      settings: {
        currency: formData.settings.currency || 'USD',
        taxRate: formData.settings.taxRate || 0,
        businessHours: {
          open: formData.settings.businessHours.open || '09:00',
          close: formData.settings.businessHours.close || '18:00',
          days: formData.settings.businessHours.days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        orderSettings: {
          autoConfirm: formData.settings.orderSettings.autoConfirm || false,
          requirePayment: formData.settings.orderSettings.requirePayment || false,
          allowCancellation: formData.settings.orderSettings.allowCancellation !== false
        }
      },
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0
      }
    }

    console.log('Creating shop with data:', shopData)
    
    onSave(shopData)
  }

  const updateBusinessInfo = (field: string, value: any) => {
    setFormData({
      ...formData,
      businessInfo: {
        ...formData.businessInfo,
        [field]: value
      }
    })
  }

  const updateSettings = (field: string, value: any) => {
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        [field]: value
      }
    })
  }

  const updateBusinessHours = (field: string, value: any) => {
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        businessHours: {
          ...formData.settings.businessHours,
          [field]: value
        }
      }
    })
  }

  const updateOrderSettings = (field: string, value: any) => {
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        orderSettings: {
          ...formData.settings.orderSettings,
          [field]: value
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">Create New Shop</h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-telegram-secondary-bg rounded-lg p-1 mb-6">
          {[
            { id: 'basic', label: 'Basic Info', icon: Store },
            { id: 'business', label: 'Business', icon: Globe },
            { id: 'settings', label: 'Settings', icon: Clock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-telegram-button text-telegram-button-text'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Store className="w-4 h-4 inline mr-1" />
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    required
                    placeholder="Enter shop name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    Shop URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    placeholder="my-shop (auto-generated if empty)"
                  />
                  <p className="text-xs text-telegram-hint mt-1">
                    Used in URLs. Leave empty to auto-generate from shop name.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                  rows={3}
                  required
                  placeholder="Describe your shop..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <Image className="w-4 h-4 inline mr-1" />
                  Shop Logo
                </label>
                <ImageUpload
                  value={formData.logo}
                  onChange={(url) => setFormData({...formData, logo: url})}
                  placeholder="Upload shop logo"
                />
              </div>
            </div>
          )}

          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessInfo.name}
                  onChange={(e) => updateBusinessInfo('name', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                  placeholder="Official business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Business Description
                </label>
                <textarea
                  value={formData.businessInfo.description}
                  onChange={(e) => updateBusinessInfo('description', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                  rows={3}
                  placeholder="Detailed business description..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.businessInfo.address}
                    onChange={(e) => updateBusinessInfo('address', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    placeholder="Business address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.businessInfo.phone}
                    onChange={(e) => updateBusinessInfo('phone', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    placeholder="Business phone"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.businessInfo.email}
                    onChange={(e) => updateBusinessInfo('email', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    placeholder="Business email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.businessInfo.website}
                    onChange={(e) => updateBusinessInfo('website', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* General Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-telegram-text border-b pb-2">General Settings</h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.settings.currency}
                      onChange={(e) => updateSettings('currency', e.target.value)}
                      className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="ETB">ETB (Br)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.settings.taxRate}
                      onChange={(e) => updateSettings('taxRate', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="space-y-4">
                <h4 className="font-medium text-telegram-text border-b pb-2">Business Hours</h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={formData.settings.businessHours.open}
                      onChange={(e) => updateBusinessHours('open', e.target.value)}
                      className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={formData.settings.businessHours.close}
                      onChange={(e) => updateBusinessHours('close', e.target.value)}
                      className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-2">
                    Operating Days
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { value: 'monday', label: 'Mon' },
                      { value: 'tuesday', label: 'Tue' },
                      { value: 'wednesday', label: 'Wed' },
                      { value: 'thursday', label: 'Thu' },
                      { value: 'friday', label: 'Fri' },
                      { value: 'saturday', label: 'Sat' },
                      { value: 'sunday', label: 'Sun' }
                    ].map((day) => (
                      <label key={day.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.settings.businessHours.days.includes(day.value)}
                          onChange={(e) => {
                            const days = e.target.checked
                              ? [...formData.settings.businessHours.days, day.value]
                              : formData.settings.businessHours.days.filter(d => d !== day.value)
                            updateBusinessHours('days', days)
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-telegram-text">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-telegram-text border-b pb-2">Order Settings</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.orderSettings.autoConfirm}
                      onChange={(e) => updateOrderSettings('autoConfirm', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-telegram-text">Auto-confirm orders</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.orderSettings.requirePayment}
                      onChange={(e) => updateOrderSettings('requirePayment', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-telegram-text">Require payment before processing</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings.orderSettings.allowCancellation}
                      onChange={(e) => updateOrderSettings('allowCancellation', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-telegram-text">Allow order cancellation</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2 font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Create Shop</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-telegram-hint text-telegram-hint rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShopCreateModal