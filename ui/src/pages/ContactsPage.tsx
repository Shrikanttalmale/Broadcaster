import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Upload, Trash2, Edit2 } from 'lucide-react';
import api from '../services/api';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  tags?: string[];
  groupId?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    tags: '',
  });

  // Fetch contacts
  useEffect(() => {
    fetchContacts();
  }, [page, search]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/contacts', {
        params: { page, search, limit: 20 },
      });
      setContacts(response.data.data.contacts);
      setTotal(response.data.data.pagination.total);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = formData.tags
        ? formData.tags.split(',').map((t) => t.trim())
        : [];

      await api.post('/api/v1/contacts', {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      setFormData({ name: '', phoneNumber: '', email: '', tags: '' });
      setShowAddModal(false);
      setPage(1);
      fetchContacts();
    } catch (error: any) {
      console.error('Error creating contact:', error);
    }
  };

  const handleDeleteContacts = async () => {
    if (selectedContacts.length === 0) return;

    try {
      await api.delete('/api/v1/contacts/bulk-delete', {
        data: { ids: selectedContacts },
      });

      setSelectedContacts([]);
      fetchContacts();
    } catch (error: any) {
      console.error('Error deleting contacts:', error);
    }
  };

  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      const contacts = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(',');
          return {
            name: values[headers.indexOf('name')] || '',
            phoneNumber: values[headers.indexOf('phonenumber') || headers.indexOf('phone')] || '',
            email: values[headers.indexOf('email')] || '',
            category: values[headers.indexOf('category')] || '',
            tags: values[headers.indexOf('tags')] ? values[headers.indexOf('tags')].split(';') : [],
          };
        })
        .filter((c) => c.name && c.phoneNumber);

      await api.post('/api/v1/contacts/bulk-import', { 
        contacts,
        skipDuplicates: true,
        updateIfExists: false,
        defaultCountry: 'IN'
      });
      fetchContacts();
    } catch (error: any) {
      console.error('Error importing CSV:', error);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-600">Manage your audience and contact lists</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleImportCSV(e.target.files[0])}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>

              {selectedContacts.length > 0 && (
                <button
                  onClick={handleDeleteContacts}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedContacts.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No contacts found. Start by adding a contact or importing from CSV.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts(contacts.map((c) => c.id));
                          } else {
                            setSelectedContacts([]);
                          }
                        }}
                        checked={selectedContacts.length === contacts.length}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact.id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {contact.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{contact.phoneNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {contact.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {contact.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContacts()}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 border rounded ${
                        page === p
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Add New Contact</h2>
            <form onSubmit={handleAddContact}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. vip, newsletter, active"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
