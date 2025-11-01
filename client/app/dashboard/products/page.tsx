'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { productsApi } from '@/lib/api';
import { Product } from '@/lib/types';
import Button from '@/components/Button';
import toast from 'react-hot-toast';

export default function DashboardProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/products?limit=100');
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = async (productId: number, currentStatus: boolean) => {
    try {
      await productsApi.toggleFeatured(productId, !currentStatus);
      toast.success(`Product ${!currentStatus ? 'featured' : 'unfeatured'} successfully`);
      fetchProducts();
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      toast.error('Failed to update featured status');
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/products/${productId}`);
      if (response.data.success) {
        toast.success('Product deleted successfully');
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
        <Button onClick={() => router.push('/dashboard/products/new')}>
          Add New Product
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Image</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Featured</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden">
                        <Image
                          src={product.image_path || product.image_url || '/placeholder.jpg'}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold">₹{parseFloat(product.price).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`${product.stock_quantity < 10 ? 'text-red-600' : 'text-green-600'} font-medium`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {product.categories && product.categories.length > 0 ? (
                          product.categories.map((cat) => (
                            <span key={cat.id} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                              {cat.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">No category</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleFeatured(product.id, product.is_featured || false)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          product.is_featured
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {product.is_featured ? '⭐ Featured' : 'Feature'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
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





