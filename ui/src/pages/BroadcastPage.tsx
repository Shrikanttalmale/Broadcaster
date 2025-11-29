import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import api from '../services/api';

interface Campaign {
  id: string;
  name: string;
  templateId: string;
  totalContacts: number;
}

interface Message {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
}

interface CampaignStats {
  totalMessages: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  deliveryRate: number;
  readRate: number;
}

export default function BroadcastPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const [sendForm, setSendForm] = useState({
    phoneNumber: '',
    message: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/campaigns');
      setCampaigns(response.data.data.campaigns);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignSelect = async (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    await fetchCampaignMessages(campaignId);
    await fetchCampaignStats(campaignId);
  };

  const fetchCampaignMessages = async (campaignId: string) => {
    try {
      setMessagesLoading(true);
      const response = await api.get(`/api/v1/broadcast/campaign/${campaignId}/messages`);
      setMessages(response.data.data.messages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchCampaignStats = async (campaignId: string) => {
    try {
      const response = await api.get(`/api/v1/broadcast/campaign/${campaignId}/stats`);
      setStats(response.data.data.stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSendDirect = async () => {
    try {
      await api.post('/api/v1/broadcast/send-direct', {
        phoneNumber: sendForm.phoneNumber,
        message: sendForm.message,
      });

      setShowSendConfirm(false);
      setMessages([]); // Clear for fresh fetch
      setStats(null);
      setSelectedCampaignId('');
      setSendForm({ phoneNumber: '', message: '' });
    } catch (error: any) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendCampaign = async () => {
    try {
      await api.post('/api/v1/broadcast/send-campaign', {
        campaignId: selectedCampaignId,
      });

      setShowSendConfirm(false);
      await fetchCampaignMessages(selectedCampaignId);
      await fetchCampaignStats(selectedCampaignId);
    } catch (error: any) {
      console.error('Error sending campaign:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'read':
        return 'bg-indigo-100 text-indigo-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Broadcasting</h1>
          <p className="text-gray-600">Send campaigns or direct messages to contacts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Send Options */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* Send Campaign */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Campaign</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Campaign</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => handleCampaignSelect(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Choose a campaign...</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.totalContacts} contacts)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedCampaignId && (
                    <button
                      onClick={() => setShowSendConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Send className="w-4 h-4" />
                      Send Campaign
                    </button>
                  )}
                </div>
              </div>

              <hr />

              {/* Send Direct Message */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Direct Message</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={sendForm.phoneNumber}
                      onChange={(e) => setSendForm({ ...sendForm, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={sendForm.message}
                      onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
                      placeholder="Type your message..."
                    />
                  </div>
                  <button
                    onClick={() => setShowSendConfirm(true)}
                    disabled={!sendForm.phoneNumber || !sendForm.message}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400"
                  >
                    <Send className="w-4 h-4" />
                    Send Direct Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Stats and Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics */}
            {stats && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
                    <p className="text-sm text-gray-500">Total Messages</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.sentCount}</p>
                    <p className="text-sm text-gray-500">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.deliveredCount}</p>
                    <p className="text-sm text-gray-500">Delivered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{stats.readCount}</p>
                    <p className="text-sm text-gray-500">Read</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.failedCount}</p>
                    <p className="text-sm text-gray-500">Failed</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Delivery Rate</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${stats.deliveryRate}%` }}
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{stats.deliveryRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Read Rate</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${stats.readRate}%` }}
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{stats.readRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Table */}
            {selectedCampaignId && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Message History</h3>
                </div>
                {messagesLoading ? (
                  <div className="p-6 text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No messages sent yet</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((msg) => (
                        <tr key={msg.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{msg.phoneNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{msg.message}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(msg.status)}`}>
                              {getStatusIcon(msg.status)}
                              <span className="capitalize">{msg.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Confirmation Modal */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Send</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to send this message? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedCampaignId) {
                    handleSendCampaign();
                  } else {
                    handleSendDirect();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
