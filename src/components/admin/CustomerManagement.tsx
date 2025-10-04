import React, { useState } from 'react';
import { Users, Search, Filter, Mail, Phone, Calendar, DollarSign, Tag, Eye, FileEdit as Edit, Trash2, X } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { Customer, CustomerTag } from '../../types';
import { format } from 'date-fns';

interface CustomerManagementProps {
  selectedShopId?: string;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ selectedShopId }) => {
  const { customers, loading, error } = useCustomers(selectedShopId);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<CustomerTag | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'web' | 'telegram'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm);
    const matchesTag = filterTag === 'all' || customer.tags.includes(filterTag);
    const matchesSource = activeTab === 'all' || customer.source === activeTab;
    return matchesSearch && matchesTag && matchesSource;
  });

  const getTagColor = (tag: CustomerTag) => {
    switch (tag) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'Wholesale': return 'bg-blue-100 text-blue-800';
      case 'Regular': return 'bg-green-100 text-green-800';
      case 'New': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-3">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-telegram-secondary-bg rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-telegram-secondary-bg rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedShopId) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-telegram-hint" />
        <h3 className="mt-2 text-sm font-medium text-telegram-text">No Shop Selected</h3>
        <p className="mt-1 text-sm text-telegram-hint">
          Please select a shop to view its customers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-telegram-text">Customer Management</h3>
          <p className="text-xs text-telegram-hint">View and manage your customers</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Total Customers</p>
              <p className="text-lg font-bold text-telegram-text">{customers.length}</p>
            </div>
            <Users className="h-6 w-6 text-telegram-button" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Web Customers</p>
              <p className="text-lg font-bold text-telegram-button">
                {customers.filter(c => c.source === 'web').length}
              </p>
            </div>
            <Users className="h-6 w-6 text-telegram-button" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Telegram</p>
              <p className="text-lg font-bold text-green-600">
                {customers.filter(c => c.source === 'telegram').length}
              </p>
            </div>
            <Users className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">VIP</p>
              <p className="text-lg font-bold text-purple-600">
                {customers.filter(c => c.tags.includes('VIP')).length}
              </p>
            </div>
            <Tag className="h-6 w-6 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Customer Source Tabs */}
      <div className="bg-telegram-secondary-bg rounded-lg">
        <div className="border-b border-telegram-hint/20">
          <nav className="flex space-x-4 px-3 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-telegram-button text-telegram-button'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                activeTab === 'web'
                  ? 'border-telegram-button text-telegram-button'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              Web ({customers.filter(c => c.source === 'web').length})
            </button>
            <button
              onClick={() => setActiveTab('telegram')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                activeTab === 'telegram'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              Telegram ({customers.filter(c => c.source === 'telegram').length})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-telegram-secondary-bg rounded-lg p-3">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-telegram-hint" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text text-sm focus:ring-2 focus:ring-telegram-button focus:border-transparent"
            />
          </div>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value as CustomerTag | 'all')}
            className="px-3 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text text-sm focus:ring-2 focus:ring-telegram-button focus:border-transparent"
          >
            <option value="all">All Tags</option>
            <option value="VIP">VIP</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Regular">Regular</option>
            <option value="New">New</option>
          </select>

          <div className="text-xs text-telegram-hint whitespace-nowrap">
            Showing {filteredCustomers.length} of {customers.length}
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-telegram-secondary-bg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-telegram-bg">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Last Order
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-telegram-secondary-bg divide-y divide-telegram-hint/10">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-telegram-bg">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-telegram-button flex items-center justify-center">
                          <span className="text-xs font-medium text-telegram-button-text">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-xs font-medium text-telegram-text">{customer.name}</div>
                        {customer.telegramUsername && (
                          <div className="text-xs text-telegram-hint">@{customer.telegramUsername}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs text-telegram-text">
                      {customer.email && (
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-1 text-telegram-hint" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center mt-1">
                          <Phone className="w-3 h-3 mr-1 text-telegram-hint" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-telegram-text">{customer.totalOrders}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-telegram-text">${customer.totalSpent.toFixed(2)}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs text-telegram-text">
                      {customer.lastOrderDate ? format(customer.lastOrderDate, 'MMM dd, yyyy') : 'Never'}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-telegram-button hover:text-telegram-button/80 p-1 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-telegram-hint" />
            <h3 className="mt-2 text-sm font-medium text-telegram-text">
              {customers.length === 0 ? 'No customers yet' : 'No customers match your filters'}
            </h3>
            <p className="mt-1 text-xs text-telegram-hint">
              {customers.length === 0
                ? 'Customers will appear here once they place orders.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

// Customer Detail Modal Component
interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-telegram-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-telegram-hint/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-telegram-text">Customer Details</h2>
            <button
              onClick={onClose}
              className="text-telegram-hint hover:text-telegram-text p-2 rounded-full hover:bg-telegram-secondary-bg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-telegram-button flex items-center justify-center">
              <span className="text-lg font-bold text-telegram-button-text">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-telegram-text">{customer.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {customer.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-telegram-text mb-2 text-sm">Contact Information</h4>
              <div className="space-y-2 text-xs">
                {customer.email && (
                  <div className="flex items-center">
                    <Mail className="w-3 h-3 mr-2 text-telegram-hint" />
                    <span className="text-telegram-text">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center">
                    <Phone className="w-3 h-3 mr-2 text-telegram-hint" />
                    <span className="text-telegram-text">{customer.phone}</span>
                  </div>
                )}
                {customer.telegramUsername && (
                  <div className="flex items-center">
                    <span className="w-3 h-3 mr-2 text-telegram-hint">@</span>
                    <span className="text-telegram-text">{customer.telegramUsername}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-telegram-text mb-2 text-sm">Order Statistics</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Total Orders:</span>
                  <span className="font-medium text-telegram-text">{customer.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Total Spent:</span>
                  <span className="font-medium text-telegram-text">${customer.totalSpent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Average Order:</span>
                  <span className="font-medium text-telegram-text">
                    ${customer.totalOrders > 0 ? (customer.totalSpent / customer.totalOrders).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Last Order:</span>
                  <span className="font-medium text-telegram-text">
                    {customer.lastOrderDate ? format(customer.lastOrderDate, 'MMM dd, yyyy') : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Customer Since:</span>
                  <span className="font-medium text-telegram-text">
                    {format(customer.createdAt, 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-telegram-hint/20 bg-telegram-secondary-bg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;