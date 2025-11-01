'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Input from '@/components/Input';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    default_address: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        default_address: user.default_address || '',
      });
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.put('/api/users/profile', {
        name: formData.name,
        default_address: formData.default_address,
      });

      if (response.data.success) {
        toast.success('Profile updated successfully!');
        await refreshUser();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container-custom py-20">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Information</h2>
            <p className="text-sm text-gray-600">
              Role: <span className="font-medium capitalize">{user?.role}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              disabled
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Address
              </label>
              <textarea
                value={formData.default_address}
                onChange={(e) => setFormData({ ...formData, default_address: e.target.value })}
                placeholder="Enter your default shipping address"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Update Profile
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/profile/addresses')}
              className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="font-medium">My Addresses</span>
              <p className="text-sm text-gray-600">Manage your shipping addresses</p>
            </button>

            <button
              onClick={() => router.push('/orders')}
              className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="font-medium">My Orders</span>
              <p className="text-sm text-gray-600">View your order history</p>
            </button>

            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => router.push('/dashboard')}
                className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="font-medium">Dashboard</span>
                <p className="text-sm text-gray-600">Manage products and orders</p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}






