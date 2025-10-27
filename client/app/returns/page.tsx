'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { returnsApi } from '@/lib/api';
import { ReturnRequest } from '@/lib/types';

export default function ReturnsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      loadReturns();
    }
  }, [user]);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      const data = await returnsApi.getReturnRequests();
      setReturns(data.data.returns || []);
    } catch (error) {
      console.error('Error loading returns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Return Requests</h1>
          <p className="text-gray-600 mt-2">Track and manage your product return requests</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading return requests...</p>
          </div>
        ) : returns.length === 0 ? (
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">No return requests</h3>
            <p className="mt-2 text-gray-600">
              You haven't requested any product returns yet.
            </p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              View Orders
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((returnRequest) => (
              <div
                key={returnRequest.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Return Request #{returnRequest.id}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Order #{returnRequest.order_id} • Item #{returnRequest.order_item_id}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      returnRequest.status
                    )}`}
                  >
                    {returnRequest.status.charAt(0).toUpperCase() +
                      returnRequest.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Reason</h4>
                    <p className="text-gray-900 mt-1">{returnRequest.reason}</p>
                  </div>

                  {returnRequest.admin_notes && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Admin Notes</h4>
                      <p className="text-gray-900 mt-1">{returnRequest.admin_notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase">
                        Requested On
                      </h4>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(returnRequest.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {returnRequest.processed_at && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase">
                          Processed On
                        </h4>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(returnRequest.processed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {returnRequest.status === 'approved' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-start">
                        <svg
                          className="h-5 w-5 text-green-600 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-green-800">
                            Return Approved
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your return request has been approved. Please follow the return
                            instructions sent to your email.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {returnRequest.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <div className="flex items-start">
                        <svg
                          className="h-5 w-5 text-red-600 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-red-800">
                            Return Rejected
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            Your return request has been rejected. Please contact support if
                            you have questions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

