'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { returnsApi } from '@/lib/api';
import { ReturnRequest } from '@/lib/types';

export default function ReturnRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      loadReturns();
    }
  }, [user]);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      const response = await returnsApi.getReturnRequests();
      setReturns(response.data.returns || []);
    } catch (error) {
      console.error('Error loading returns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (returnId: number, status: string) => {
    if (!confirm(`Are you sure you want to ${status} this return request?`)) {
      return;
    }

    try {
      await returnsApi.updateReturnStatus(returnId, {
        status,
        admin_notes: adminNotes || undefined,
      });
      setAdminNotes('');
      setSelectedReturn(null);
      await loadReturns();
      alert(`Return request ${status} successfully!`);
    } catch (error) {
      console.error('Error updating return status:', error);
      alert('Failed to update return status. Please try again.');
    }
  };

  const filteredReturns = returns.filter(ret =>
    filterStatus === 'all' || ret.status === filterStatus
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null;
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="text-gray-600 mt-1">Manage product return requests</p>
      </div>

      {!selectedReturn ? (
        <div>
          {/* Filter */}
          <div className="mb-4 flex gap-2">
            {['all', 'pending', 'approved', 'rejected', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading return requests...</p>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900">No return requests found</h3>
              <p className="mt-2 text-gray-600">No return requests match the selected filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order / Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReturns.map((returnRequest) => (
                    <tr key={returnRequest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{returnRequest.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Order #{returnRequest.order_id}
                        <br />
                        <span className="text-gray-500">Item #{returnRequest.order_item_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnRequest.user_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {returnRequest.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(returnRequest.status)}`}>
                          {returnRequest.status.charAt(0).toUpperCase() + returnRequest.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(returnRequest.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedReturn(returnRequest)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={() => {
              setSelectedReturn(null);
              setAdminNotes('');
            }}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to list
          </button>

          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Return Request #{selectedReturn.id}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Order #{selectedReturn.order_id} • Item #{selectedReturn.order_item_id}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedReturn.status)}`}>
                  {selectedReturn.status.charAt(0).toUpperCase() + selectedReturn.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase">Customer</h3>
                <p className="mt-1 text-gray-900">{selectedReturn.user_name || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase">Request Date</h3>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedReturn.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Reason for Return</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900">{selectedReturn.reason}</p>
              </div>
            </div>

            {selectedReturn.admin_notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Admin Notes</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-900">{selectedReturn.admin_notes}</p>
                </div>
              </div>
            )}

            {selectedReturn.processed_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase">Processed Date</h3>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedReturn.processed_at).toLocaleString()}
                </p>
              </div>
            )}

            {selectedReturn.status === 'pending' && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Take Action</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Add notes about your decision..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpdateStatus(selectedReturn.id, 'approved')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Return
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedReturn.id, 'rejected')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Return
                  </button>
                </div>
              </div>
            )}

            {selectedReturn.status === 'approved' && (
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => handleUpdateStatus(selectedReturn.id, 'completed')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Mark as Completed
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

