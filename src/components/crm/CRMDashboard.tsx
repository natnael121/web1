import React, { useState, useEffect } from 'react'
import { Users, Activity, Clock, Tag, RefreshCw } from 'lucide-react'
import { getContactStats } from '../../services/crmService'
import { syncAllContacts, getLastSyncTimestamp, updateSyncTimestamp } from '../../services/crmSyncService'
import { CRMStats } from '../../types'

interface CRMDashboardProps {
  shopId: string
  onFilterChange?: (filter: 'all' | 'active' | 'inactive') => void
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ shopId, onFilterChange }) => {
  const [stats, setStats] = useState<CRMStats>({
    totalCustomers: 0,
    activeThisWeek: 0,
    inactive30Plus: 0,
    topTags: []
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getContactStats(shopId)
      setStats(data)

      const lastSyncTime = await getLastSyncTimestamp(shopId)
      setLastSync(lastSyncTime)
    } catch (error) {
      console.error('Error loading CRM stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shopId) {
      loadStats()
    }
  }, [shopId])

  const handleSyncAll = async () => {
    try {
      setSyncing(true)
      const result = await syncAllContacts(shopId)

      if (result.success) {
        await updateSyncTimestamp(shopId)
        await loadStats()
        alert(`Successfully synced ${result.contactsProcessed} contacts!`)
      } else {
        alert(`Sync completed with errors. Processed: ${result.contactsProcessed}. Errors: ${result.errors.length}`)
      }
    } catch (error) {
      console.error('Error syncing contacts:', error)
      alert('Failed to sync contacts. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-telegram-text">CRM Dashboard</h3>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-xs text-telegram-hint">
              Last sync: {lastSync.toLocaleString()}
            </span>
          )}
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-1 px-3 py-2 bg-telegram-button text-telegram-button-text rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          onClick={() => onFilterChange?.('all')}
          className="bg-telegram-secondary-bg p-4 rounded-lg cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-telegram-button/10 rounded-lg">
              <Users className="h-5 w-5 text-telegram-button" />
            </div>
            <span className="text-2xl font-bold text-telegram-text">
              {stats.totalCustomers}
            </span>
          </div>
          <h3 className="text-sm font-medium text-telegram-text">Total Customers</h3>
          <p className="text-xs text-telegram-hint mt-1">All contacts in your CRM</p>
        </div>

        <div
          onClick={() => onFilterChange?.('active')}
          className="bg-telegram-secondary-bg p-4 rounded-lg cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-telegram-text">
              {stats.activeThisWeek}
            </span>
          </div>
          <h3 className="text-sm font-medium text-telegram-text">Active This Week</h3>
          <p className="text-xs text-telegram-hint mt-1">
            Engaged in the last 7 days
          </p>
        </div>

        <div
          onClick={() => onFilterChange?.('inactive')}
          className="bg-telegram-secondary-bg p-4 rounded-lg cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-telegram-text">
              {stats.inactive30Plus}
            </span>
          </div>
          <h3 className="text-sm font-medium text-telegram-text">Inactive 30+ Days</h3>
          <p className="text-xs text-telegram-hint mt-1">
            Need re-engagement
          </p>
        </div>
      </div>

      {stats.topTags.length > 0 && (
        <div className="bg-telegram-secondary-bg p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-telegram-hint" />
            <h3 className="text-base font-semibold text-telegram-text">Top Tags</h3>
          </div>
          <div className="space-y-2">
            {stats.topTags.map((tagData, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-telegram-text">
                  {tagData.tag}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-telegram-hint/20 rounded-full h-2">
                    <div
                      className="bg-telegram-button h-2 rounded-full transition-all"
                      style={{
                        width: `${(tagData.count / stats.totalCustomers) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-telegram-hint w-12 text-right">
                    {tagData.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CRMDashboard
