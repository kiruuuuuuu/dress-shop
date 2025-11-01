import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Remove Content-Type header for FormData - let axios/browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      Cookies.remove('token');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  verifyEmail: (token: string) =>
    api.get('/api/auth/verify-email', { params: { token } }),
  resendVerification: (email: string) =>
    api.post('/api/auth/resend-verification', { email }),
  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/api/auth/reset-password', { token, password }),
};

// Support Tickets API
export const supportApi = {
  createTicket: (data: { type: string; subject: string; message: string; priority?: string }) =>
    api.post('/api/support/tickets', data),
  getTickets: (params?: { status?: string; type?: string; page?: number; limit?: number }) =>
    api.get('/api/support/tickets', { params }),
  getTicketById: (id: number) =>
    api.get(`/api/support/tickets/${id}`),
  addResponse: (ticketId: number, message: string) =>
    api.post(`/api/support/tickets/${ticketId}/responses`, { message }),
  updateTicketStatus: (ticketId: number, data: { status?: string; assigned_to?: number }) =>
    api.put(`/api/support/tickets/${ticketId}/status`, data),
  getStats: () =>
    api.get('/api/support/stats'),
};

// Returns API
export const returnsApi = {
  createReturnRequest: (data: { order_id: number; order_item_id: number; reason: string }) =>
    api.post('/api/returns', data),
  getReturnRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/api/returns', { params }),
  getReturnRequestById: (id: number) =>
    api.get(`/api/returns/${id}`),
  updateReturnStatus: (id: number, data: { status: string; admin_notes?: string }) =>
    api.put(`/api/returns/${id}/status`, data),
  checkEligibility: (orderId: number, orderItemId: number) =>
    api.get(`/api/returns/check/${orderId}/${orderItemId}`),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (params?: { unread?: boolean; limit?: number }) =>
    api.get('/api/notifications', { params }),
  markAsRead: (id: number) =>
    api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () =>
    api.put('/api/notifications/read-all'),
  deleteNotification: (id: number) =>
    api.delete(`/api/notifications/${id}`),
  clearAll: () =>
    api.delete('/api/notifications'),
};

// Products API
export const productsApi = {
  // Public product functions
  getAllProducts: (params?: { category?: string; minPrice?: number; maxPrice?: number; search?: string; page?: number; limit?: number }) =>
    api.get('/api/products', { params }),
  getFeaturedProducts: () => api.get('/api/products/featured'),
  getProductById: (productId: number) => api.get(`/api/products/${productId}`),
  
  // Admin/Manager functions
  createProduct: (formData: FormData) => api.post('/api/products', formData),
  updateProduct: (productId: number, formData: FormData) => api.put(`/api/products/${productId}`, formData),
  toggleFeatured: (productId: number, is_featured: boolean) => 
    api.put(`/api/products/${productId}/featured`, { is_featured }),
  deleteProduct: (productId: number) => api.delete(`/api/products/${productId}`),
};

// Categories API
export const categoriesApi = {
  getAllCategories: () => api.get('/api/categories'),
  getCategoryById: (categoryId: number) => api.get(`/api/categories/${categoryId}`),
  createCategory: (data: { name: string; slug: string; description?: string }) =>
    api.post('/api/categories', data),
  updateCategory: (categoryId: number, data: { name?: string; slug?: string; description?: string }) =>
    api.put(`/api/categories/${categoryId}`, data),
  deleteCategory: (categoryId: number) => api.delete(`/api/categories/${categoryId}`),
};

// Cart API
export const cartApi = {
  getCart: () => api.get('/api/cart'),
  addToCart: (data: { product_id: number; quantity: number }) =>
    api.post('/api/cart', data),
  updateCartItem: (itemId: number, quantity: number) =>
    api.put(`/api/cart/${itemId}`, { quantity }),
  removeFromCart: (itemId: number) => api.delete(`/api/cart/${itemId}`),
  clearCart: () => api.delete('/api/cart'),
};

// Checkout API
export const checkoutApi = {
  createOrder: (data: { shipping_address: string }) =>
    api.post('/api/checkout/create-order', data),
  verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post('/api/checkout/verify-payment', data),
};

// Orders API extensions
export const ordersApi = {
  // Customer order functions
  getMyOrders: () => api.get('/api/orders/my/list'),
  getOrderById: (orderId: number) => api.get(`/api/orders/${orderId}`),
  updateOrderStatus: (orderId: number, status: string) =>
    api.put(`/api/orders/${orderId}/status`, { status }),
  
  // Manager/Admin functions
  getAllOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/api/orders', { params }),
  getPendingApprovalOrders: (params?: { page?: number; limit?: number }) =>
    api.get('/api/orders/pending-approval', { params }),
  updateOrderApproval: (orderId: number, data: { approval_status: 'approved' | 'rejected' }) =>
    api.put(`/api/orders/${orderId}/approval`, data),
  generateBill: (orderId: number) =>
    api.get(`/api/orders/${orderId}/bill`),
  printBill: (orderId: number) =>
    api.post(`/api/orders/${orderId}/print`),
  
  // Order stats
  getOrderStats: () => api.get('/api/orders/stats/summary'),
};

// Users API
export const usersApi = {
  getAllUsers: (params?: { role?: string; page?: number; limit?: number }) =>
    api.get('/api/users', { params }),
  getUserById: (userId: number) => api.get(`/api/users/${userId}`),
  updateUserRole: (userId: number, role: string) =>
    api.put(`/api/users/${userId}/role`, { role }),
  deleteUser: (userId: number) => api.delete(`/api/users/${userId}`),
  updateProfile: (data: any) => api.put('/api/users/profile', data),
};

// Address API
export const addressesApi = {
  getMyAddresses: () => api.get('/api/addresses'),
  getAddressById: (id: number) => api.get(`/api/addresses/${id}`),
  addAddress: (data: {
    address_type?: string;
    full_name: string;
    mobile_number: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    is_default?: boolean;
  }) => api.post('/api/addresses', data),
  updateAddress: (id: number, data: {
    address_type?: string;
    full_name?: string;
    mobile_number?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    is_default?: boolean;
  }) => api.put(`/api/addresses/${id}`, data),
  deleteAddress: (id: number) => api.delete(`/api/addresses/${id}`),
  setDefaultAddress: (id: number) => api.put(`/api/addresses/${id}/default`),
};

// Printer API
export const printersApi = {
  getPrinters: () => api.get('/api/printers'),
  addPrinter: (data: { printer_name: string; printer_ip?: string; connection_type?: string }) =>
    api.post('/api/printers', data),
  updatePrinter: (id: number, data: { printer_name?: string; printer_ip?: string; connection_type?: string }) =>
    api.put(`/api/printers/${id}`, data),
  deletePrinter: (id: number) => api.delete(`/api/printers/${id}`),
  setDefaultPrinter: (id: number) => api.put(`/api/printers/${id}/default`),
  scanPrinters: () => api.get('/api/printers/available'),
};

export default api;
