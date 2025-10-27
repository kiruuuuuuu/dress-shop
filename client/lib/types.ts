export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'manager' | 'admin';
  default_address?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  return_days: number;
  categories?: Category[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  product_count?: number;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
}

export interface Order {
  id: number;
  user_id: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  total_price: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  approval_status: 'pending_approval' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  shipping_address: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  item_count?: number;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  product_name?: string;
  image_url?: string;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  type: 'feedback' | 'error' | 'question' | 'complaint' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  assigned_to_name?: string;
  responses?: TicketResponse[];
}

export interface TicketResponse {
  id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_name?: string;
}

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_item_id: number;
  user_id: number;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'processing' | 'completed';
  reviewed_by?: number;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  product_name?: string;
  image_url?: string;
  quantity?: number;
  price_at_purchase?: number;
  reviewed_by_name?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_id?: number;
  related_type?: string;
  created_at: string;
}

export interface Bill {
  orderId: number;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentId?: string;
  status: string;
}

export interface BillItem {
  productName: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
