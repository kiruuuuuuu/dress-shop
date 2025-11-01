'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supportApi, notificationsApi, ordersApi } from '@/lib/api';
import { SupportTicket, TicketResponse } from '@/lib/types';
import toast from 'react-hot-toast';

export default function SupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    type: 'other' as 'feedback' | 'error' | 'question' | 'complaint' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    order_reference: '' as string | number,
  });

  // New response
  const [newResponse, setNewResponse] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load user orders for order reference
  useEffect(() => {
    if (user && isOpen) {
      loadUserOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen]);

  // Load tickets when opened
  useEffect(() => {
    if (isOpen && user) {
      loadTickets();
      loadUnreadCount();
      
      // Auto-refresh every 10 seconds
      refreshIntervalRef.current = setInterval(() => {
        if (selectedTicket) {
          loadTicketResponses(selectedTicket.id);
        } else {
          loadTickets();
        }
        loadUnreadCount();
      }, 10000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOpen, user, selectedTicket]);

  // Filter tickets based on search and status
  useEffect(() => {
    let filtered = tickets;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  }, [tickets, searchQuery, filterStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [responses]);

  const loadUserOrders = async () => {
    try {
      const response = await ordersApi.getMyOrders();
      setUserOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const response = await supportApi.getTickets();
      setTickets(response.data.tickets || []);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast.error(error.response?.data?.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsApi.getNotifications({ unread: true });
      const ticketNotifications = response.data.notifications.filter(
        (n: any) => n.type === 'support_ticket' || n.type === 'ticket_response'
      );
      setUnreadCount(ticketNotifications.length);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadTicketResponses = async (ticketId: number) => {
    try {
      const response = await supportApi.getTicketById(ticketId);
      setSelectedTicket(response.data.ticket);
      setResponses(response.data.ticket.responses || []);
    } catch (error: any) {
      console.error('Error loading ticket responses:', error);
      toast.error(error.response?.data?.message || 'Failed to load ticket');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await supportApi.createTicket({
        subject: newTicket.subject,
        message: newTicket.message,
        type: newTicket.type,
        priority: newTicket.priority,
      });
      toast.success('Support ticket created successfully!');
      setNewTicket({
        subject: '',
        message: '',
                        type: 'other',
        priority: 'medium',
        order_reference: '',
      });
      setShowNewTicket(false);
      await loadTickets();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newResponse.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      await supportApi.addResponse(selectedTicket.id, newResponse);
      toast.success('Message sent!');
      setNewResponse('');
      await loadTicketResponses(selectedTicket.id);
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    try {
      await supportApi.updateTicketStatus(selectedTicket.id, { status: 'closed' });
      toast.success('Ticket closed');
      await loadTicketResponses(selectedTicket.id);
      await loadTickets();
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast.error(error.response?.data?.message || 'Failed to close ticket');
    }
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setResponses([]);
    setShowNewTicket(false);
    setSearchQuery('');
    setFilterStatus('all');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question':
        return '❓';
      case 'complaint':
        return '⚠️';
      case 'error':
        return '🐛';
      case 'feedback':
        return '💡';
      case 'other':
        return '📋';
      default:
        return '💬';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="Support Chat"
      >
        <div className="relative">
          {isOpen ? (
            <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-300 sm:w-[450px] sm:h-[650px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="font-semibold text-lg">Support Center</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
            {!selectedTicket && !showNewTicket && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <h4 className="font-semibold text-gray-800 text-lg">Your Tickets</h4>
                  <button
                    onClick={() => setShowNewTicket(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Ticket
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Tickets List */}
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : !filteredTickets || filteredTickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mb-2">No tickets found</p>
                    {searchQuery || filterStatus !== 'all' ? (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('all');
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowNewTicket(true)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Create your first ticket
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 flex-1">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => loadTicketResponses(ticket.id)}
                        className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getTypeIcon(ticket.type)}</span>
                              <h5 className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600">
                                {ticket.subject}
                              </h5>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{ticket.message}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`} title={ticket.priority}></span>
                              <span className="text-xs text-gray-500">
                                {formatDate(ticket.created_at)}
                              </span>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Ticket Form */}
            {showNewTicket && (
              <div className="flex flex-col h-full">
                {/* Header with Back Button - Fixed at top */}
                <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToList}
                      className="text-gray-600 hover:text-gray-800 transition-colors p-1 hover:bg-gray-100 rounded"
                      aria-label="Back"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h4 className="font-semibold text-gray-800 text-lg">Create New Ticket</h4>
                  </div>
                </div>
                
                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-4">

                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter a brief subject for your ticket"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Summarize your issue in a few words</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                      <select
                        value={newTicket.type}
                        onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="question">Question</option>
                        <option value="complaint">Complaint</option>
                        <option value="error">Error Report</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                      <select
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newTicket.message}
                      onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      placeholder="Describe your issue in detail. Include any relevant information, order numbers, product details, etc."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Provide as much detail as possible to help us assist you better</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </span>
                    ) : (
                      'Create Ticket'
                    )}
                  </button>
                </form>
                </div>
              </div>
            )}

            {/* Ticket Conversation */}
            {selectedTicket && (
              <div className="flex flex-col h-full">
                {/* Ticket Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                  <button
                    onClick={handleBackToList}
                    className="mb-3 text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Tickets
                  </button>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900 text-sm mb-1">{selectedTicket.subject}</h5>
                        <p className="text-xs text-gray-600 line-clamp-2">{selectedTicket.message}</p>
                      </div>
                      <span className="text-2xl flex-shrink-0">{getTypeIcon(selectedTicket.type)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${getPriorityColor(selectedTicket.priority)}`} title={selectedTicket.priority}></span>
                      <span className="text-xs text-gray-500">{formatDate(selectedTicket.created_at)}</span>
                      {selectedTicket.assigned_to_name && (
                        <span className="text-xs text-gray-500">Assigned to: {selectedTicket.assigned_to_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Original Ticket Message */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">You</span>
                      <span className="text-xs text-gray-500">{formatDate(selectedTicket.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{selectedTicket.message}</p>
                  </div>

                  {/* Responses */}
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className={`rounded-lg p-3 ${
                        response.is_admin
                          ? 'bg-indigo-50 border border-indigo-200 ml-8'
                          : 'bg-gray-100 border border-gray-200 mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {response.is_admin ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              Support Team
                            </span>
                          ) : (
                            'You'
                          )}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(response.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                  <div className="border-t border-gray-200 bg-white p-3">
                    <form onSubmit={handleSendResponse} className="flex gap-2">
                      <input
                        type="text"
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                      >
                        Send
                      </button>
                    </form>
                    {user?.role === 'admin' || user?.role === 'manager' ? (
                      <button
                        onClick={handleCloseTicket}
                        className="mt-2 w-full text-sm text-gray-600 hover:text-gray-800 py-1.5 px-3 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                      >
                        Close Ticket
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Closed Ticket Message */}
                {(selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') && (
                  <div className="border-t border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-sm text-gray-600">
                      This ticket is {selectedTicket.status === 'resolved' ? 'resolved' : 'closed'}. You can still view the conversation but cannot send new messages.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}