import React, { useState } from 'react'
import { Shop } from '../../types'
import { X, Save, Store, FileText, Image, Globe, Phone, Mail, MapPin, Clock } from 'lucide-react'
import ImageUpload from '../common/ImageUpload'

interface ShopEditModalProps {
  shop: Shop
  onSave: (shop: Shop) => void
  onCancel: () => void
}

const ShopEditModal: React.FC<ShopEditModalProps> = ({ shop, onSave, onCancel }) => {
  const [formData, setFormData] = useState(shop)
  const [activeTab, setActiveTab] = useState<'basic' | 'business' | 'settings'>('basic')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">Edit Shop</h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-telegram-secondary-bg rounded-lg p-1 mb-6">
          {[
            { id: 'basic', label: 'Basic Info', icon: Store },
            { id: 'business', label: 'Business Info', icon: Globe },
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
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <Image className="w-4 h-4 inline mr-1" />
                  Shop Logo
                </label>
                <ImageUpload
                  value={formData.logo || ''}
                  onChange={(url) => setFormData({...formData, logo: url})}
                  placeholder="Upload shop logo"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-telegram-text">
                  Shop is active
                </label>
              </div>
            </div>
          )}

          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.businessInfo?.address || ''}
                    onChange={(e) => updateBusinessInfo('address', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.businessInfo?.phone || ''}
                    onChange={(e) => updateBusinessInfo('phone', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
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
                    value={formData.businessInfo?.email || ''}
                    onChange={(e) => updateBusinessInfo('email', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.businessInfo?.website || ''}
                    onChange={(e) => updateBusinessInfo('website', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Special Message
                </label>
                <textarea
                  value={formData.businessInfo?.specialMessage || ''}
                  onChange={(e) => updateBusinessInfo('specialMessage', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  rows={3}
                  placeholder="Special message for customers..."
                />
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.settings?.currency || 'USD'}
                    onChange={(e) => updateSettings('currency', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="ETB">ETB (Br)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="KES">KES (KSh)</option>
                    <option value="ZAR">ZAR (R)</option>
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
                    value={formData.settings?.taxRate || 0}
                    onChange={(e) => updateSettings('taxRate', parseFloat(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  />
                </div>

              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.settings?.businessHours?.open || '09:00'}
                    onChange={(e) => updateSettings('businessHours', {
                      ...formData.settings?.businessHours,
                      open: e.target.value
                    })}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.settings?.businessHours?.close || '18:00'}
                    onChange={(e) => updateSettings('businessHours', {
                      ...formData.settings?.businessHours,
                      close: e.target.value
                    })}
                    className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
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
                        checked={(formData.settings?.businessHours?.days || []).includes(day.value)}
                        onChange={(e) => {
                          const currentDays = formData.settings?.businessHours?.days || []
                          const days = e.target.checked
                            ? [...currentDays, day.value]
                            : currentDays.filter(d => d !== day.value)
                          updateSettings('businessHours', {
                            ...formData.settings?.businessHours,
                            days
                          })
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-telegram-text">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-telegram-text">Order Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoConfirm"
                      checked={formData.settings?.orderSettings?.autoConfirm || false}
                      onChange={(e) => updateSettings('orderSettings', {
                        ...formData.settings?.orderSettings,
                        autoConfirm: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="autoConfirm" className="text-sm text-telegram-text">
                      Auto-confirm orders
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requirePayment"
                      checked={formData.settings?.orderSettings?.requirePayment || false}
                      onChange={(e) => updateSettings('orderSettings', {
                        ...formData.settings?.orderSettings,
                        requirePayment: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="requirePayment" className="text-sm text-telegram-text">
                      Require payment before processing
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowCancellation"
                      checked={formData.settings?.orderSettings?.allowCancellation ?? true}
                      onChange={(e) => updateSettings('orderSettings', {
                        ...formData.settings?.orderSettings,
                        allowCancellation: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="allowCancellation" className="text-sm text-telegram-text">
                      Allow order cancellation
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-telegram-hint text-telegram-hint rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShopEditModal