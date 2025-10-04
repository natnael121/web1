import React, { useState } from 'react'
import {
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  Tag
} from 'lucide-react'
import { Shop, CRMContact } from '../../types'
import CRMDashboard from './CRMDashboard'
import CRMContactBook from './CRMContactBook'
import CRMContactDetail from './CRMContactDetail'
import CRMMessageComposer from './CRMMessageComposer'
import MessageTemplatesManager from './MessageTemplatesManager'
import AutoTagRulesManager from './AutoTagRulesManager'

interface CRMPanelProps {
  shopId: string
  shop?: Shop
  botToken: string
}

const CRMPanel: React.FC<CRMPanelProps> = ({ shopId, shop, botToken }) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'contacts' | 'templates' | 'autoTag'
  >('dashboard')
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [messageMode, setMessageMode] = useState<'single' | 'multiple'>('single')
  const [selectedContacts, setSelectedContacts] = useState<CRMContact[]>([])
  const [showMessageComposer, setShowMessageComposer] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleContactSelect = (contact: CRMContact) => {
    setSelectedContact(contact)
  }

  const handleSendMessage = (contact: CRMContact) => {
    setSelectedContacts([contact])
    setMessageMode('single')
    setShowMessageComposer(true)
    setSelectedContact(null)
  }

  const handleFilterChange = (filter: 'all' | 'active' | 'inactive') => {
    setFilterMode(filter)
    setActiveTab('contacts')
  }

  const handleMessageSent = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleContactUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: BarChart3
    },
    {
      id: 'contacts' as const,
      label: 'Contacts',
      icon: Users
    },
    {
      id: 'templates' as const,
      label: 'Templates',
      icon: MessageSquare
    },
    {
      id: 'autoTag' as const,
      label: 'Auto-Tag Rules',
      icon: Tag
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <CRMDashboard
              key={refreshTrigger}
              shopId={shopId}
              onFilterChange={handleFilterChange}
            />
          )}

          {activeTab === 'contacts' && (
            <CRMContactBook
              key={refreshTrigger}
              shopId={shopId}
              filterMode={filterMode}
              onContactSelect={handleContactSelect}
            />
          )}

          {activeTab === 'templates' && (
            <MessageTemplatesManager shopId={shopId} />
          )}

          {activeTab === 'autoTag' && (
            <AutoTagRulesManager shopId={shopId} />
          )}
        </div>
      </div>

      {selectedContact && (
        <CRMContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSendMessage={handleSendMessage}
          onUpdate={handleContactUpdate}
        />
      )}

      {showMessageComposer && selectedContacts.length > 0 && (
        <CRMMessageComposer
          shopId={shopId}
          shop={shop}
          botToken={botToken}
          mode={messageMode}
          contacts={selectedContacts}
          onClose={() => {
            setShowMessageComposer(false)
            setSelectedContacts([])
          }}
          onSent={handleMessageSent}
        />
      )}
    </div>
  )
}

export default CRMPanel
