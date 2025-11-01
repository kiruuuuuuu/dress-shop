'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { printersApi } from '@/lib/api';
import { PrinterSettings } from '@/lib/types';
import toast from 'react-hot-toast';

export default function PrinterSettingsPage() {
  const { user } = useAuth();
  const [printers, setPrinters] = useState<PrinterSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterSettings | null>(null);
  
  const [formData, setFormData] = useState({
    printer_name: '',
    printer_ip: '',
    connection_type: 'wifi' as 'wifi' | 'usb' | 'network',
  });

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      setIsLoading(true);
      const response = await printersApi.getPrinters();
      setPrinters(response.data.printers || []);
    } catch (error) {
      console.error('Error loading printers:', error);
      toast.error('Failed to load printers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPrinter) {
        await printersApi.updatePrinter(editingPrinter.id, formData);
        toast.success('Printer updated successfully');
      } else {
        await printersApi.addPrinter(formData);
        toast.success('Printer added successfully');
      }
      
      setShowAddForm(false);
      setEditingPrinter(null);
      setFormData({ printer_name: '', printer_ip: '', connection_type: 'wifi' });
      loadPrinters();
    } catch (error: any) {
      console.error('Error saving printer:', error);
      toast.error(error.response?.data?.message || 'Failed to save printer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this printer?')) return;
    
    try {
      await printersApi.deletePrinter(id);
      toast.success('Printer deleted successfully');
      loadPrinters();
    } catch (error: any) {
      console.error('Error deleting printer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete printer');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await printersApi.setDefaultPrinter(id);
      toast.success('Default printer updated');
      loadPrinters();
    } catch (error: any) {
      console.error('Error setting default printer:', error);
      toast.error('Failed to set default printer');
    }
  };

  const handleEdit = (printer: PrinterSettings) => {
    setEditingPrinter(printer);
    setFormData({
      printer_name: printer.printer_name,
      printer_ip: printer.printer_ip || '',
      connection_type: printer.connection_type as any,
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPrinter(null);
    setFormData({ printer_name: '', printer_ip: '', connection_type: 'wifi' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Printer Settings</h1>
          <p className="text-gray-600 mt-1">Configure printers for automatic bill printing</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Printer
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPrinter ? 'Edit Printer' : 'Add New Printer'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Printer Name *
              </label>
              <input
                type="text"
                value={formData.printer_name}
                onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Office Printer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Printer IP Address
              </label>
              <input
                type="text"
                value={formData.printer_ip}
                onChange={(e) => setFormData({ ...formData, printer_ip: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="192.168.1.100 (for network printers)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for WiFi/Network printers. Leave blank for USB printers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection Type *
              </label>
              <select
                value={formData.connection_type}
                onChange={(e) => setFormData({ ...formData, connection_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="wifi">WiFi</option>
                <option value="network">Network</option>
                <option value="usb">USB</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                {editingPrinter ? 'Update Printer' : 'Add Printer'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <p className="text-gray-600 mb-4">No printers configured</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Your First Printer
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Connection</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">IP Address</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((printer) => (
                <tr key={printer.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{printer.printer_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize">{printer.connection_type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-600 font-mono text-sm">
                      {printer.printer_ip || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {printer.is_default ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Default
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!printer.is_default && (
                        <button
                          onClick={() => handleSetDefault(printer.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(printer)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(printer.id)}
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

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">About Automatic Printing</h3>
        <p className="text-sm text-blue-800">
          Orders will be automatically sent to your default printer after payment confirmation. 
          Make sure your printer is connected to the same network and properly configured.
        </p>
      </div>
    </div>
  );
}
