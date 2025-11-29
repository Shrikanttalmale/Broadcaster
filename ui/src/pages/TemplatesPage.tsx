import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import api from '../services/api';

interface Template {
  id: string;
  name: string;
  subject?: string;
  body: string;
  variables?: string[];
  category?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewData, setPreviewData] = useState<any>({});

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/templates');
      setTemplates(response.data.data.templates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/templates', {
        name: formData.name,
        subject: formData.subject || undefined,
        body: formData.body,
        category: formData.category || undefined,
      });

      setFormData({ name: '', subject: '', body: '', category: '' });
      setShowAddModal(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error creating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/api/v1/templates/${id}`);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
    }
  };

  const handlePreview = async (template: Template) => {
    setSelectedTemplate(template);
    // Initialize preview data with sample values
    const sampleData: any = {};
    (template.variables || []).forEach((v) => {
      sampleData[v] = `[${v}]`;
    });
    setPreviewData(sampleData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Message Templates</h1>
          <p className="text-gray-600">Create and manage reusable message templates</p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No templates yet. Create one to get started.
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                {template.category && (
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mb-3">
                    {template.category}
                  </span>
                )}

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{template.body}</p>

                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((v) => (
                        <span key={v} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                          {'{{'}{v}{'}}'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handlePreview(template)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button className="flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Template</h2>
            <form onSubmit={handleAddTemplate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Welcome Message"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Promotional"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject (Optional)</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Special Offer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Body *</label>
                <textarea
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  placeholder="Use {{variable}} for dynamic content. e.g. Hello {{name}}, your email is {{email}}"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Tip: Use {'{{variable}}'} syntax for dynamic content
                </p>
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
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Template Preview: {selectedTemplate.name}</h2>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Preview Data:</h3>
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {selectedTemplate.variables.map((v) => (
                    <input
                      key={v}
                      type="text"
                      placeholder={`Enter ${v}`}
                      value={previewData[v] || ''}
                      onChange={(e) => setPreviewData({ ...previewData, [v]: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No variables in this template</p>
              )}
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Preview Output:</h3>
              <p className="text-gray-700 whitespace-pre-wrap break-words">
                {selectedTemplate.body.replace(/\{\{(\w+)\}\}/g, (match, key) => previewData[key] || match)}
              </p>
            </div>

            <button
              onClick={() => setSelectedTemplate(null)}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
