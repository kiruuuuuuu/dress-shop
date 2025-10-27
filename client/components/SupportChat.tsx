'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supportApi } from '@/lib/api';
import { SupportTicket, TicketResponse } from '@/lib/types';

export default function SupportChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    type: 'general' as 'general' | 'order' | 'product' | 'payment' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  // New response
  const [newResponse, setNewResponse] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && user) {
      loadTickets();
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [responses]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const response = await supportApi.getTickets();
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketResponses = async (ticketId: number) => {
    try {
      const response = await supportApi.getTicketById(ticketId);
      setSelectedTicket(response.data.ticket);
      setResponses(response.data.ticket.responses || []);
    } catch (error) {
      console.error('Error loading ticket responses:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return;

    try {
      setIsLoading(true);
      await supportApi.createTicket(newTicket);
      setNewTicket({ subject: '', message: '', type: 'general', priority: 'medium' });
      setShowNewTicket(false);
      await loadTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newResponse.trim()) return;

    try {
      await supportApi.addResponse(selectedTicket.id, newResponse);
      setNewResponse('');
      await loadTicketResponses(selectedTicket.id);
    } catch (error) {
      console.error('Error sending response:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setResponses([]);
    setShowNewTicket(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
        aria-label="Support Chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="font-semibold text-lg">Support Chat</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {!selectedTicket && !showNewTicket && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-800">Your Tickets</h4>
                  <button
                    onClick={() => setShowNewTicket(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    New Ticket
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : !tickets || tickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No tickets yet</p>
                    <button
                      onClick={() => setShowNewTicket(true)}
                      className="mt-2 text-blue-600 hover:underline"
                    >
                      Create your first ticket
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => loadTicketResponses(ticket.id)}
                        className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow border border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 text-sm">{ticket.subject}</h5>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              ticket.status === 'resolved'
                                ? 'bg-green-100 text-green-800'
                                : ticket.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showNewTicket && (
              <div>
                <button
                  onClick={handleBackToList}
                  className="mb-4 text-blue-600 hover:text-blue-700 flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <form onSubmit={handleCreateTicket} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newTicket.type}
                      onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="general">General</option>
                      <option value="order">Order Issue</option>
                      <option value="product">Product Question</option>
                      <option value="payment">Payment Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={newTicket.message}
                      onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Ticket'}
                  </button>
                </form>
              </div>
            )}

            {selectedTicket && (
              <div className="flex flex-col h-full">
                <button
                  onClick={handleBackToList}
                  className="mb-4 text-blue-600 hover:text-blue-700 flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="bg-white p-3 rounded-lg mb-4 border border-gray-200">
                  <h5 className="font-medium text-gray-900">{selectedTicket.subject}</h5>
                  <p className="text-sm text-gray-600 mt-1">{selectedTicket.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded ${
                      selectedTicket.status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : selectedTicket.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTicket.status}
                    </span>
                    <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className={`p-3 rounded-lg ${
                        response.is_admin
                          ? 'bg-blue-50 border border-blue-200 ml-4'
                          : 'bg-gray-100 border border-gray-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {response.is_admin ? 'Support Team' : 'You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(response.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{response.message}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                  <form onSubmit={handleSendResponse} className="flex gap-2">
                    <input
                      type="text"
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

