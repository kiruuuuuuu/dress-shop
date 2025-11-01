'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ordersApi, returnsApi } from '@/lib/api';
import { Order } from '@/lib/types';

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await ordersApi.getMyOrders();
      // Backend returns: { success: true, orders: [...] }
      // Axios wraps it in response.data
      const ordersData = response?.data?.orders || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      // Set empty array on error to prevent undefined errors
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReturn = async (orderId: number, orderItemId: number) => {
    // Check eligibility first
    try {
      const eligibility = await returnsApi.checkReturnEligibility(orderId, orderItemId);
      
      if (!eligibility.eligible) {
        alert(eligibility.message);
        return;
      }

      setSelectedItem({ orderId, orderItemId });
      setShowReturnModal(true);
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      alert('Failed to check return eligibility. Please try again.');
    }
  };

  const submitReturnRequest = async () => {
    if (!selectedItem || !returnReason.trim()) {
      alert('Please provide a reason for the return.');
      return;
    }

    try {
      await returnsApi.createReturnRequest({
        order_id: selectedItem.orderId,
        order_item_id: selectedItem.orderItemId,
        reason: returnReason,
      });

      alert('Return request submitted successfully!');
      setShowReturnModal(false);
      setReturnReason('');
      setSelectedItem(null);
      loadOrders();
    } catch (error) {
      console.error('Error submitting return request:', error);
      alert('Failed to submit return request. Please try again.');
    }
  };

  const handleViewBill = async (orderId: number) => {
    try {
      const data = await ordersApi.generateBill(orderId);
      setBillData(data.bill);
      setShowBill(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Failed to generate bill. Please try again.');
    }
  };

  const printBill = () => {
    window.print();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">View and manage your orders</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No orders yet</h3>
            <p className="mt-2 text-gray-600">Start shopping to see your orders here.</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders && Array.isArray(orders) && orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order {order.order_number || `#${order.id}`}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Order ID: #{order.id} • Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.approval_status && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getApprovalStatusColor(
                          order.approval_status
                        )}`}
                      >
                        {order.approval_status === 'pending_approval'
                          ? 'Pending Approval'
                          : order.approval_status.charAt(0).toUpperCase() +
                            order.approval_status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        ₹{parseFloat(order.total_price).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Payment Status</p>
                      <p className={`text-sm font-semibold mt-1 ${
                        order.razorpay_payment_id ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {order.razorpay_payment_id ? 'Paid' : 'Pending'}
                      </p>
                      {order.razorpay_payment_id && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          {order.razorpay_payment_id.substring(0, 15)}...
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Items</p>
                      <p className="text-sm text-gray-900 mt-1">{order.item_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Shipping</p>
                      <p className="text-sm text-gray-900 mt-1 truncate">
                        {order.shipping_address?.substring(0, 30)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => router.push(`/orders/${order.id}/bill`)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-1"
                    >
                      📄 View Invoice
                    </button>

                    {order.status === 'delivered' &&
                      order.approval_status === 'approved' && (
                        <button
                          onClick={() => handleRequestReturn(order.id, 1)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            />
                          </svg>
                          Request Return
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Product Return</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Return *
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Please describe why you want to return this item..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReason('');
                  setSelectedItem(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReturnRequest}
                disabled={!returnReason.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBill && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
                <p className="text-sm text-gray-600">Order #{billData.orderId}</p>
              </div>
              <button
                onClick={() => setShowBill(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase">Customer</h3>
                  <p className="text-gray-900 mt-1">{billData.customerName}</p>
                  <p className="text-sm text-gray-600">{billData.customerEmail}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase">Order Date</h3>
                  <p className="text-gray-900 mt-1">
                    {new Date(billData.orderDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Shipping Address</h3>
                <p className="text-gray-900 mt-1">{billData.shippingAddress}</p>
              </div>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Item</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Qty</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Price</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {billData.items.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">{item.productName}</td>
                    <td className="py-3 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-900">
                      ₹{item.pricePerUnit.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-3 text-right font-medium text-gray-900">
                    Subtotal:
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    ₹{billData.subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-3 text-right text-lg font-bold text-gray-900">
                    Total:
                  </td>
                  <td className="py-3 text-right text-lg font-bold text-gray-900">
                    ₹{billData.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600">
                <strong>Payment ID:</strong> {billData.paymentId}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Status:</strong> {billData.status}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBill(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={printBill}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
