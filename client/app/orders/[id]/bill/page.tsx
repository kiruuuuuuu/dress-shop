'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Bill } from '@/lib/types';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

export default function BillPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const orderId = params?.id;

  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (orderId) {
        fetchBill();
      }
    }
  }, [authLoading, isAuthenticated, orderId, router]);

  const fetchBill = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/orders/${orderId}/bill`);
      if (response.data.success) {
        setBill(response.data.bill);
      } else {
        toast.error('Failed to load bill');
        router.push('/orders');
      }
    } catch (error: any) {
      console.error('Failed to fetch bill:', error);
      toast.error(error.response?.data?.message || 'Failed to load bill');
      router.push('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!bill) {
    return null;
  }

  return (
    <div className="container-custom py-8 print:p-4 print:max-w-full">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:max-w-full print:m-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 print:bg-gray-900 invoice-header print:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 print:text-2xl print:mb-1">Invoice / Bill</h1>
              <p className="text-blue-100">Order Number: <span className="font-mono font-semibold">{bill.orderNumber}</span></p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-1">Date</p>
              <p className="font-semibold">{new Date(bill.orderDate).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 print:p-4">
          {/* From/To Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 invoice-addresses print:gap-3 print:mb-3 print:grid-cols-2">
            {/* From Address */}
            <div className="bg-gray-50 p-4 rounded-lg print:p-3 print:bg-transparent print:border print:border-gray-300">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide print:mb-2 print:text-xs">From</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">{bill.fromAddress.name}</p>
                <p>{bill.fromAddress.address_line1}</p>
                <p>{bill.fromAddress.address_line2}</p>
                <p>{bill.fromAddress.city}, {bill.fromAddress.state} - {bill.fromAddress.pincode}</p>
                <p>{bill.fromAddress.country}</p>
                <p className="mt-2">
                  <span className="text-gray-500">Phone:</span> {bill.fromAddress.mobile}
                </p>
                <p>
                  <span className="text-gray-500">Email:</span> {bill.fromAddress.email}
                </p>
              </div>
            </div>

            {/* To Address */}
            <div className="bg-gray-50 p-4 rounded-lg print:p-3 print:bg-transparent print:border print:border-gray-300">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide print:mb-2 print:text-xs">Ship To</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">{bill.toAddress.name}</p>
                {bill.toAddress.address_line1 && <p>{bill.toAddress.address_line1}</p>}
                {bill.toAddress.address_line2 && <p>{bill.toAddress.address_line2}</p>}
                <p>{bill.toAddress.city}, {bill.toAddress.state} - {bill.toAddress.pincode}</p>
                <p>{bill.toAddress.country}</p>
                <p className="mt-2">
                  <span className="text-gray-500">Phone:</span> {bill.toAddress.mobile}
                </p>
                {bill.toAddress.email && (
                  <p>
                    <span className="text-gray-500">Email:</span> {bill.toAddress.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 print:p-2 print:mb-3 print:bg-transparent print:border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Payment Status</p>
                <p className={`font-semibold ${bill.paymentStatus === 'Paid' ? 'text-green-600' : bill.paymentStatus === 'Pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {bill.paymentStatus}
                </p>
              </div>
              {bill.transactionId && bill.transactionId !== 'N/A' && (
                <div>
                  <p className="text-gray-600 mb-1">Transaction ID</p>
                  <p className="font-mono text-xs text-gray-900 break-all">{bill.transactionId}</p>
                </div>
              )}
              {bill.razorpayPaymentId && (
                <div>
                  <p className="text-gray-600 mb-1">Payment ID</p>
                  <p className="font-mono text-xs text-gray-900 break-all">{bill.razorpayPaymentId.substring(0, 20)}...</p>
                </div>
              )}
              <div>
                <p className="text-gray-600 mb-1">Order Status</p>
                <p className="font-semibold text-gray-900 capitalize">{bill.status || 'Pending'}</p>
              </div>
            </div>
            {bill.razorpayOrderId && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Razorpay Order ID</p>
                <p className="font-mono text-xs text-gray-900 break-all">{bill.razorpayOrderId}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="mb-6 invoice-items print:mb-3">
            <h3 className="font-semibold text-gray-900 mb-4 text-lg print:mb-2 print:text-base">Order Items</h3>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse print:text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700 print:px-2 print:py-2 print:text-xs">Product</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 print:px-2 print:py-2 print:text-xs">Code</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 print:px-2 print:py-2 print:text-xs">Quantity</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-2 print:text-xs">Unit Price</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-2 print:text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 invoice-item-row print:hover:bg-transparent">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 print:px-2 print:py-2 print:text-xs">{item.productName}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-xs text-gray-600 print:px-2 print:py-2 font-mono">{item.productCode || 'N/A'}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-700 print:px-2 print:py-2 print:text-xs">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700 print:px-2 print:py-2 print:text-xs">₹{(parseFloat(item.pricePerUnit?.toString() || '0')).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 print:px-2 print:py-2 print:text-xs">₹{(parseFloat(item.total?.toString() || '0')).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="ml-auto max-w-xs invoice-summary print:max-w-full print:ml-0 print:mt-2">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 print:p-2 print:bg-transparent">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>₹{(parseFloat(bill.subtotal?.toString() || '0')).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tax:</span>
                  <span>₹{(parseFloat(bill.tax?.toString() || '0')).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping:</span>
                  <span>₹{(parseFloat(bill.shipping?.toString() || '0')).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total:</span>
                    <span>₹{(parseFloat(bill.total?.toString() || '0')).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-6 border-t">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden">
            <p className="text-sm text-gray-600 text-center sm:text-left">
              Thank you for your business!
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePrint}>
                🖨️ Print Invoice
              </Button>
              <Button onClick={() => router.push('/orders')}>
                Back to Orders
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4 print:mt-0">
            This is a computer-generated invoice and does not require a signature.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          
          /* Hide all navigation, footer, and other elements */
          nav,
          header:not(.invoice-header),
          footer,
          .navbar,
          .footer,
          main > nav,
          [class*="Navbar"],
          [class*="Footer"],
          [class*="SupportChat"],
          button:not(.print-button),
          .print\\:hidden,
          .chat-bubble,
          #support-chat {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Hide main layout wrapper padding */
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Hide body padding */
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Optimize invoice container for print */
          .container-custom {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          
          /* Invoice wrapper */
          .container-custom > div {
            margin: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* Reduce padding for print */
          .invoice-header {
            padding: 1.5rem !important;
            page-break-inside: avoid;
          }
          
          .invoice-addresses {
            margin-bottom: 1rem !important;
            page-break-inside: avoid;
          }
          
          .invoice-items {
            margin-bottom: 1rem !important;
            page-break-inside: avoid;
          }
          
          .invoice-summary {
            page-break-inside: avoid;
            margin-top: 1rem !important;
          }
          
          /* Prevent page breaks inside table rows */
          .invoice-item-row {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          /* Table styling for print */
          table {
            page-break-inside: auto;
            font-size: 0.875rem;
          }
          
          thead {
            display: table-header-group;
          }
          
          tbody tr {
            page-break-inside: avoid;
          }
          
          /* Remove all shadows and rounded corners */
          * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* Ensure proper page breaks */
          .print-break-before {
            page-break-before: always;
          }
          
          .print-break-after {
            page-break-after: always;
          }
          
          /* Compact spacing */
          div[class*="p-8"] {
            padding: 1rem !important;
          }
          
          /* Hide footer message on print */
          .bg-gray-100 > p {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

