'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import api from '@/lib/api';
import { addressesApi } from '@/lib/api';
import { Address } from '@/lib/types';
import Input from '@/components/Input';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { cart, total, clearCart } = useCart();

  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'mock'>('mock');
  
  // New address form state
  const [newAddress, setNewAddress] = useState({
    full_name: user?.name || '',
    mobile_number: '',
    house_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    address_type: 'home',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && cart.length === 0) {
      router.push('/cart');
    }
    if (isAuthenticated && user) {
      loadAddresses();
    }

    // Check if returning from add-address page
    const fromCheckout = sessionStorage.getItem('fromCheckout');
    if (fromCheckout === 'true') {
      // Reload addresses to get the newly added one
      loadAddresses();
      sessionStorage.removeItem('fromCheckout');
    }
  }, [authLoading, isAuthenticated, cart, router, user]);

  useEffect(() => {
    if (user) {
      setNewAddress((prev) => ({ ...prev, full_name: user.name || '' }));
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const response = await addressesApi.getMyAddresses();
      const addressesData = response.data.addresses || [];
      setAddresses(Array.isArray(addressesData) ? addressesData : []);
      
      // Set default address if available
      const defaultAddress = addressesData.find((addr: Address) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddAddress = async () => {
    // Validate new address
    if (!newAddress.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!newAddress.mobile_number.trim()) {
      toast.error('Mobile number is required');
      return;
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(newAddress.mobile_number)) {
      toast.error('Invalid mobile number. Must be 10 digits starting with 6-9');
      return;
    }
    if (!newAddress.pincode.trim()) {
      toast.error('Pincode is required');
      return;
    }
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(newAddress.pincode)) {
      toast.error('Invalid pincode. Must be 6 digits');
      return;
    }
    if (!newAddress.address_line1.trim()) {
      toast.error('Address line 1 is required');
      return;
    }
    if (!newAddress.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!newAddress.state.trim()) {
      toast.error('State is required');
      return;
    }

    try {
      const response = await addressesApi.addAddress({
        ...newAddress,
        is_default: addresses.length === 0, // Set as default if it's the first address
      });
      
      const addedAddress = response.data.address;
      setAddresses([...addresses, addedAddress]);
      setSelectedAddressId(addedAddress.id);
      setShowAddAddressForm(false);
      toast.success('Address added successfully');
      
      // Reset form
      setNewAddress({
        full_name: user?.name || '',
        mobile_number: '',
        house_number: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        address_type: 'home',
      });
    } catch (error: any) {
      console.error('Error adding address:', error);
      toast.error(error.response?.data?.message || 'Failed to add address');
    }
  };

  const handlePayment = async () => {
    // Validate address selection
    if (!selectedAddressId) {
      toast.error('Please select a shipping address to continue');
      return;
    }

    // If using selected address, ensure it has mobile and pincode
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error('Selected address not found. Please select a valid address');
      return;
    }
    if (!selectedAddress.mobile_number || !selectedAddress.pincode) {
      toast.error('Selected address must have mobile number and pincode. Please edit the address.');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create order on backend
      const orderResponse = await api.post('/api/checkout/create-order', {
        shipping_address_id: selectedAddressId || undefined,
        shipping_address: selectedAddressId ? undefined : shippingAddress,
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const { order } = orderResponse.data;
      setPaymentMode(order.paymentMode || 'mock');

      // Step 2: Handle payment based on mode
      if (order.paymentMode === 'mock' || !order.paymentMode) {
        // Mock Payment - Simulate payment without Razorpay
        toast.loading('Processing payment...', { id: 'payment' });
        
        // Simulate payment delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify mock payment
        try {
          const verifyResponse = await api.post('/api/checkout/verify-payment', {
            razorpay_order_id: order.razorpayOrderId,
            razorpay_payment_id: 'mock_payment_' + Date.now(),
            razorpay_signature: 'mock_signature_' + Date.now(),
          });

          if (verifyResponse.data.success) {
            toast.success('Payment successful! Order placed successfully!', { id: 'payment', duration: 4000 });
            await clearCart();
            // Redirect with order ID - order number will be shown on success page
            router.push(`/order-success?orderId=${verifyResponse.data.orderId}`);
          } else {
            throw new Error('Payment verification failed');
          }
        } catch (error: any) {
          toast.error('Payment verification failed. Please contact support.', { id: 'payment' });
          console.error('Payment verification error:', error);
          setIsProcessing(false);
        }
      } else {
        // Razorpay Payment
        if (!razorpayLoaded) {
          toast.error('Payment gateway is loading. Please try again.');
          setIsProcessing(false);
          return;
        }

        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
          toast.error('Payment gateway not configured. Please set Razorpay keys.');
          setIsProcessing(false);
          return;
        }

        // Initialize Razorpay
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: Math.round(order.amount * 100), // Convert to paise
          currency: order.currency || 'INR',
          name: 'Sallapuradamma textiles',
          description: 'Purchase from Sallapuradamma textiles',
          order_id: order.razorpayOrderId,
          handler: async function (response: any) {
            // Step 3: Verify payment on backend
            try {
              const verifyResponse = await api.post('/api/checkout/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyResponse.data.success) {
                toast.success('🎉 Payment successful! Order placed successfully!', { duration: 4000 });
                await clearCart();
                router.push(`/order-success?orderId=${verifyResponse.data.orderId}`);
              } else {
                throw new Error('Payment verification failed');
              }
            } catch (error) {
              console.error('Payment verification error:', error);
              toast.error('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#ec4899', // primary-600
          },
          modal: {
            ondismiss: function() {
              setIsProcessing(false);
              toast.error('Payment cancelled');
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to initiate payment';
      const errorDetails = error.response?.data?.details || error.response?.data?.stack;
      
      console.error('Payment error details:', {
        message: errorMessage,
        details: errorDetails,
        response: error.response?.data,
      });
      
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  if (authLoading || !isAuthenticated || cart.length === 0) {
    return (
      <div className="container-custom py-20">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Only load Razorpay script if Razorpay key is configured */}
      {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && 
       process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID !== 'rzp_test_placeholder' && 
       process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.trim() !== '' && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => {
            setRazorpayLoaded(true);
            setPaymentMode('razorpay');
          }}
          onError={() => {
            console.warn('Razorpay script failed to load, will use mock payment');
            setRazorpayLoaded(false);
            setPaymentMode('mock');
          }}
        />
      )}

      <div className="container-custom py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Shipping Information</h2>

              <div className="space-y-6">
                <Input
                  label="Full Name"
                  type="text"
                  value={user?.name || ''}
                  disabled
                />

                <Input
                  label="Email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                />

                {/* Address Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Shipping Address *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('fromCheckout', 'true');
                        router.push('/add-address');
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add New Address
                    </button>
                  </div>
                  
                  {isLoadingAddresses ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading addresses...</p>
                    </div>
                  ) : addresses.length > 0 ? (
                    <div className="space-y-3">
                      <select
                        value={selectedAddressId || ''}
                        onChange={(e) => {
                          const addressId = e.target.value ? Number(e.target.value) : null;
                          setSelectedAddressId(addressId);
                          setShippingAddress('');
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 font-medium"
                      >
                        <option value="">Choose a saved address</option>
                        {addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.is_default && '⭐ '}{address.full_name} - {address.address_line1}, {address.city} - {address.pincode}
                          </option>
                        ))}
                      </select>

                      {/* Show selected address details */}
                      {selectedAddressId && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-primary-200 p-5 rounded-lg shadow-sm">
                          {(() => {
                            const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
                            if (!selectedAddress) return null;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 text-base mb-2">
                                      {selectedAddress.full_name}
                                      {selectedAddress.is_default && (
                                        <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-1 rounded-full">Default</span>
                                      )}
                                    </h4>
                                    <div className="text-sm text-gray-700 space-y-1">
                                      {selectedAddress.house_number && (
                                        <p className="font-medium">
                                          <span className="text-gray-500">House No:</span> {selectedAddress.house_number}
                                        </p>
                                      )}
                                      <p>{selectedAddress.address_line1}</p>
                                      {selectedAddress.address_line2 && (
                                        <p>{selectedAddress.address_line2}</p>
                                      )}
                                      <p className="font-medium">
                                        {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                                      </p>
                                      <p>{selectedAddress.country}</p>
                                      <p className="pt-2 border-t border-primary-200">
                                        <span className="text-gray-500">Mobile:</span> <span className="font-semibold">{selectedAddress.mobile_number}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => router.push('/profile/addresses')}
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium ml-4"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {!selectedAddressId && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Please select an address</strong> or <button
                              type="button"
                              onClick={() => {
                                sessionStorage.setItem('fromCheckout', 'true');
                                router.push('/add-address');
                              }}
                              className="text-primary-600 hover:text-primary-700 font-semibold underline"
                            >
                              add a new one
                            </button>
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => router.push('/profile/addresses')}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Manage All Addresses
                      </button>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                      <svg className="w-12 h-12 text-blue-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="font-semibold text-gray-900 mb-2">No saved addresses</h3>
                      <p className="text-sm text-gray-600 mb-4">Add your first shipping address to continue</p>
                      <Button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem('fromCheckout', 'true');
                          router.push('/add-address');
                        }}
                      >
                        + Add Address
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} x {item.quantity}
                    </span>
                    <span className="font-semibold">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 text-lg shadow-lg"
                size="lg"
                onClick={handlePayment}
                isLoading={isProcessing}
                disabled={isProcessing || !selectedAddressId || (paymentMode === 'razorpay' && !razorpayLoaded)}
              >
                {isProcessing 
                  ? 'Processing Payment...' 
                  : paymentMode === 'mock' || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'rzp_test_placeholder' 
                    ? 'Complete Order' 
                    : razorpayLoaded 
                      ? 'Proceed to Payment' 
                      : 'Loading...'}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {paymentMode === 'mock' || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'rzp_test_placeholder' ? (
                  <span className="text-gray-500">🔒 Secure checkout process</span>
                ) : (
                  <span className="text-gray-500">🔒 Secure payment powered by Razorpay</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}





