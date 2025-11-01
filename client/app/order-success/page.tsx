'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Order } from '@/lib/types';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

export default function OrderSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        console.error('Failed to fetch order:', response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      // If order fetch fails, show basic success message
      toast.error('Order placed but details unavailable. Please check "My Orders".');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-20">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-lg p-8 text-center text-white">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold mb-3">
            🎉 Order Placed Successfully!
          </h1>
          
          <p className="text-green-50 text-lg">
            Thank you for your purchase. Your order has been confirmed and will be processed soon.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-b-lg shadow-xl p-8 border-t-4 border-green-500">
          {order && (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Order Number</p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {order.order_number || `ORD-${order.id}`}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <h3 className="text-2xl font-bold text-green-600">
                      ₹{parseFloat(order.total_price as string).toFixed(2)}
                    </h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Order Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{order.status || 'Pending'}</p>
                  </div>
                  {order.razorpay_payment_id && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Transaction ID</p>
                      <p className="font-mono text-xs text-gray-700 break-all">
                        {order.razorpay_payment_id.substring(0, 20)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-1">What's Next?</p>
                    <p className="text-sm text-yellow-800">
                      Your order is pending approval. You will receive a notification once it's approved and ready for processing.
                      You can track your order status from "My Orders" page.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/orders/${order?.id}/bill`}>
              <Button size="lg" variant="outline">
                📄 View Invoice
              </Button>
            </Link>
            <Link href="/orders">
              <Button size="lg">
                📦 View My Orders
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="outline">
                🛒 Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}





