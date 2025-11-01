'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/lib/api';
import { Order } from '@/lib/types';
import toast from 'react-hot-toast';

export default function OrderApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState<any>(null);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      loadPendingOrders();
    }
  }, [user]);

  const loadPendingOrders = async () => {
    try {
      setIsLoading(true);
      const response = await ordersApi.getPendingApprovalOrders();
      const ordersData = response?.data?.orders || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Error loading pending orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleApproval = async (orderId: number, approved: boolean) => {
    if (!confirm(`Are you sure you want to ${approved ? 'approve' : 'reject'} this order?`)) {
      return;
    }

    try {
      setProcessingId(orderId);
      await ordersApi.updateOrderApproval(orderId, {
        approval_status: approved ? 'approved' : 'rejected',
      });
      
      // If approved, load and show bill
      if (approved) {
        try {
          const billResponse = await ordersApi.generateBill(orderId);
          setBillData(billResponse.data.bill);
          setShowBillModal(true);
        } catch (error) {
          console.error('Error loading bill:', error);
        }
      }
      
      await loadPendingOrders();
      toast.success(`Order ${approved ? 'approved' : 'rejected'} successfully!`);
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error updating order approval:', error);
      toast.error('Failed to update order. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatAddress = (order: Order) => {
    if (order.shipping_full_name && order.address_line1) {
      // Use structured address
      return `${order.shipping_full_name}\n${order.address_line1}${order.address_line2 ? ', ' + order.address_line2 : ''}\n${order.shipping_city}, ${order.shipping_state} - ${order.shipping_pincode_db || order.shipping_pincode}\n${order.shipping_country || 'India'}\nMobile: ${order.shipping_mobile_from_address || order.shipping_mobile || order.customer_mobile || 'N/A'}`;
    }
    // Fallback to text address
    return order.shipping_address;
  };

  const getMobileNumber = (order: Order) => {
    return order.shipping_mobile || order.shipping_mobile_from_address || order.customer_mobile || 'N/A';
  };

  const getPincode = (order: Order) => {
    return order.shipping_pincode_db || order.shipping_pincode || 'N/A';
  };

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve pending orders</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending orders...</p>
        </div>
      ) : orders.length === 0 ? (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No pending approvals
          </h3>
          <p className="mt-2 text-gray-600">
            All orders have been processed. Check back later for new orders.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
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
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{order.order_number || `ORD-${order.id}`}</div>
                    <div className="text-xs text-gray-500">ID: #{order.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
                    <div className="text-sm text-gray-500">Mobile: {getMobileNumber(order)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{parseFloat(order.total_price.toString()).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.item_count || order.items?.length || 0} item(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-xs"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleApproval(order.id, true)}
                        disabled={processingId === order.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(order.id, false)}
                        disabled={processingId === order.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal - BEFORE Approval */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order Details - {selectedOrder.order_number || `#${selectedOrder.id}`}
                </h2>
                {selectedOrder.order_number && (
                  <p className="text-sm text-gray-500 mt-1">Order ID: #{selectedOrder.id}</p>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Customer Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedOrder.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mobile Number</p>
                    <p className="font-medium">{getMobileNumber(selectedOrder)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Shipping Address</h3>
                <div className="text-gray-700 whitespace-pre-line">
                  {formatAddress(selectedOrder)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Mobile</p>
                    <p className="font-medium">{getMobileNumber(selectedOrder)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pincode</p>
                    <p className="font-medium">{getPincode(selectedOrder)}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.product_name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{item.product_name}</p>
                                  <p className="text-sm text-gray-500">Product ID: {item.product_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-gray-900">₹{parseFloat(item.price_at_purchase.toString()).toFixed(2)}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              ₹{(parseFloat(item.price_at_purchase.toString()) * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total:</td>
                        <td className="px-4 py-3 font-bold text-lg">₹{parseFloat(selectedOrder.total_price.toString()).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleApproval(selectedOrder.id, false);
                  }}
                  disabled={processingId === selectedOrder.id}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Reject Order
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleApproval(selectedOrder.id, true);
                  }}
                  disabled={processingId === selectedOrder.id}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Approve Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal - AFTER Approval */}
      {showBillModal && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order Bill - {billData.orderNumber || `#${billData.orderId}`}
                </h2>
                {billData.orderNumber && (
                  <p className="text-sm text-gray-500 mt-1">Order ID: #{billData.orderId}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => setShowBillModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bill Content */}
              <div className="space-y-6">
                {/* Company Header */}
                <div className="text-center mb-6 pb-4 border-b">
                  <h1 className="text-3xl font-bold text-gray-900">Sallapuradamma textiles</h1>
                  <p className="text-gray-600 mt-2">Order Invoice</p>
                </div>

                {/* From and To Addresses */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* From Address */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">From:</h3>
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{billData.fromAddress.name}</p>
                      <p>{billData.fromAddress.address_line1}</p>
                      {billData.fromAddress.address_line2 && <p>{billData.fromAddress.address_line2}</p>}
                      <p>{billData.fromAddress.city}, {billData.fromAddress.state} - {billData.fromAddress.pincode}</p>
                      <p>{billData.fromAddress.country}</p>
                      <p className="mt-2">Mobile: {billData.fromAddress.mobile}</p>
                      <p>Email: {billData.fromAddress.email}</p>
                    </div>
                  </div>

                  {/* To Address */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">To:</h3>
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{billData.toAddress.name}</p>
                      <p>{billData.toAddress.address_line1}</p>
                      {billData.toAddress.address_line2 && <p>{billData.toAddress.address_line2}</p>}
                      <p>{billData.toAddress.city}, {billData.toAddress.state} - {billData.toAddress.pincode}</p>
                      <p>{billData.toAddress.country}</p>
                      <p className="mt-2">Mobile: {billData.toAddress.mobile}</p>
                      <p>Email: {billData.toAddress.email}</p>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Order ID</p>
                      <p className="font-medium">#{billData.orderId}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Order Date</p>
                      <p className="font-medium">{new Date(billData.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payment ID</p>
                      <p className="font-medium">{billData.paymentId || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Items Ordered</h3>
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {billData.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3">{item.productName}</td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">₹{item.pricePerUnit.toFixed(2)}</td>
                          <td className="px-4 py-3 font-medium">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold">Subtotal:</td>
                        <td className="px-4 py-3 font-medium">₹{billData.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold">Tax:</td>
                        <td className="px-4 py-3 font-medium">₹{billData.tax.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-lg">Total:</td>
                        <td className="px-4 py-3 font-bold text-lg">₹{billData.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowBillModal(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
