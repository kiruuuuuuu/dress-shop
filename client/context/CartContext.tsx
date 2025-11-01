'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { CartItem } from '@/lib/types';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartItem[];
  total: number;
  isLoading: boolean;
  addToCart: (productId: number, quantity: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch cart when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setCart([]);
      setTotal(0);
    }
  }, [isAuthenticated]);

  const refreshCart = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const response = await api.get('/api/cart');
      if (response.data.success) {
        setCart(response.data.cart);
        setTotal(parseFloat(response.data.total));
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId: number, quantity: number = 1) => {
    try {
      const response = await api.post('/api/cart', {
        product_id: productId,
        quantity,
      });

      if (response.data.success) {
        toast.success('Added to cart!');
        await refreshCart();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add to cart';
      toast.error(message);
      throw error;
    }
  };

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    try {
      const response = await api.put(`/api/cart/${cartItemId}`, { quantity });

      if (response.data.success) {
        await refreshCart();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update cart';
      toast.error(message);
      throw error;
    }
  };

  const removeFromCart = async (cartItemId: number) => {
    try {
      const response = await api.delete(`/api/cart/${cartItemId}`);

      if (response.data.success) {
        toast.success('Removed from cart');
        await refreshCart();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove from cart';
      toast.error(message);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/api/cart');
      setCart([]);
      setTotal(0);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        total,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};







