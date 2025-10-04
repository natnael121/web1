import React, { useState, useEffect } from 'react'
import { Search, Filter, User, MessageCircle, RefreshCw } from 'lucide-react'
import { getContactsByShop, searchContacts } from '../../services/crmService'
import { syncContact } from '../../services/crmSyncService'
import { CRMContact } from '../../types'

interface CRMContactBookProps {
  shopId: string
  filterMode?: 'all' | 'active' | 'inactive'
  onContactSelect: (contact: CRMContact) => void
}

const CRMContactBook: React.FC<CRMContactBookProps> = ({
  shopId,
  filterMode = 'all',
  onContactSelect
}) => {
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await getContactsByShop(shopId)
      setContacts(data)

      const tags = new Set<string>()
      data.forEach(contact => {
        contact.tags.forEach(tag => tags.add(tag))
      })
      setAvailableTags(Array.from(tags))

      applyFilters(data, searchTerm, selectedTags, filterMode)
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shopId) {
      loadContacts()
    }
  }, [shopId])

  useEffect(() => {
    applyFilters(contacts, searchTerm, selectedTags, filterMode)
  }, [searchTerm, selectedTags, filterMode, contacts])

  const applyFilters = (
    contactsList: CRMContact[],
    search: string,
    tags: string[],
    mode: 'all' | 'active' | 'inactive'
  ) => {
    let filtered = [...contactsList]

    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(term) ||
        contact.username?.toLowerCase().includes(term) ||
        contact.phone?.includes(term) ||
        contact.email?.toLowerCase().includes(term)
      )
    }

    if (tags.length > 0) {
      filtered = filtered.filter(contact =>
        tags.some(tag => contact.tags.includes(tag))
      )
    }

    if (mode === 'active') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(contact => {
        const lastDate = contact.lastContactedDate || contact.lastOrderDate
        return lastDate && lastDate >= weekAgo
      })
    } else if (mode === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(contact => {
        const lastDate = contact.lastContactedDate || contact.lastOrderDate
        return !lastDate || lastDate < thirtyDaysAgo
      })
    }

    setFilteredContacts(filtered)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleRefreshContact = async (contact: CRMContact, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setRefreshingId(contact.id)
      await syncContact(shopId, contact.telegramId)
      await loadContacts()
    } catch (error) {
      console.error('Error refreshing contact:', error)
      alert('Failed to refresh contact data')
    } finally {
      setRefreshingId(null)
    }
  }

  const getActivityIndicator = (contact: CRMContact) => {
    const lastDate = contact.lastContactedDate || contact.lastOrderDate
    if (!lastDate) return 'bg-gray-400'

    const daysSinceActivity = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceActivity <= 7) return 'bg-green-500'
    if (daysSinceActivity <= 30) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const formatLastActivity = (contact: CRMContact) => {
    const lastDate = contact.lastContactedDate || contact.lastOrderDate
    if (!lastDate) return 'No activity'

    const daysSince = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return 'Yesterday'
    if (daysSince < 7) return `${daysSince} days ago`
    if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`
    return `${Math.floor(daysSince / 30)} months ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, username, phone, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Tags:</span>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No contacts found</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => onContactSelect(contact)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {contact.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getActivityIndicator(contact)}`}
                    ></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {contact.name || 'Unknown User'}
                      </h3>
                      {contact.username && (
                        <span className="text-sm text-gray-500">
                          @{contact.username}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{formatLastActivity(contact)}</span>
                      <span>{contact.totalOrders} orders</span>
                      <span>${contact.totalSpent.toFixed(2)} spent</span>
                    </div>

                    {contact.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {contact.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {contact.notes && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {contact.notes.substring(0, 40)}
                        {contact.notes.length > 40 && '...'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleRefreshContact(contact, e)}
                      disabled={refreshingId === contact.id}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title="Refresh data"
                    >
                      <RefreshCw
                        className={`h-5 w-5 ${refreshingId === contact.id ? 'animate-spin' : ''}`}
                      />
                    </button>
                    <MessageCircle className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500 text-center">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </div>
    </div>
  )
}

export default CRMContactBook
