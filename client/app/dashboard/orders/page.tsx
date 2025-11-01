'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ordersApi } from '@/lib/api';
import { Order } from '@/lib/types';
import toast from 'react-hot-toast';

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const response = await api.get(`/api/orders${params}`);
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await api.put(`/api/orders/${orderId}/status`, {
        status: newStatus,
      });

      if (response.data.success) {
        toast.success('Order status updated');
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order status');
    }
  };

  const retryPrint = async (orderId: number) => {
    try {
      const response = await api.post(`/api/printers/retry/${orderId}`);
      if (response.data.success) {
        toast.success('Print retry initiated');
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to retry print:', error);
      toast.error('Failed to retry print');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPrintStatusColor = (status?: string) => {
    const colors: any = {
      pending: 'bg-gray-100 text-gray-800',
      printing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800">
              <strong>Automatic Approval:</strong> Orders are now automatically approved after payment. 
              Bills are printed automatically to your default printer. Configure printers in Settings.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg ${!filter ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All Orders
          </button>
          {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg capitalize ${filter === status ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Order Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Print Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{order.order_number || `ORD-${order.id}`}</p>
                        <p className="text-xs text-gray-500">ID: #{order.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{order.customer_name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{order.item_count || 0}</td>
                    <td className="py-3 px-4 font-semibold">₹{parseFloat(order.total_price.toString()).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.razorpay_payment_id ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.razorpay_payment_id ? 'Paid' : 'Pending'}
                      </span>
                      {order.razorpay_payment_id && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          {order.razorpay_payment_id.substring(0, 15)}...
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border-none ${getStatusColor(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {order.print_status ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPrintStatusColor(order.print_status)}`}>
                            {order.print_status}
                          </span>
                          {order.print_status === 'failed' && (
                            <button
                              onClick={() => retryPrint(order.id)}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                              title="Retry Print"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(`/orders/${order.id}/bill`, '_blank')}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          title="View Invoice"
                        >
                          📄
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await ordersApi.printBill(order.id);
                              toast.success('Bill sent to printer');
                            } catch (error) {
                              toast.error('Failed to print bill');
                            }
                          }}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                          title="Print Invoice"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => window.open(`/orders/${order.id}`, '_blank')}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          title="View Details"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}






