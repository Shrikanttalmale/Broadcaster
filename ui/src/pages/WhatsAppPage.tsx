import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Phone, Plus, Trash2, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';

interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  connected: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [qrError, setQRError] = useState<string | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/v1/whatsapp/sessions');
      setSessions(response.data.data.sessions);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setScanning(true);
      setQRError(null);

      const response = await api.post('/api/v1/whatsapp/start-session', {
        phoneNumber,
      });

      const { accountId, qrCode: initialQRCode } = response.data.data;

      // Set the account ID for modal state updates
      setCurrentAccountId(accountId);
      setSelectedSession({
        id: accountId,
        phoneNumber,
        connected: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setShowQRModal(true);

      let finalQRCode = initialQRCode;

      if (!finalQRCode) {
        // QR code not generated yet - show user a message
        setQRError('QR code is being generated. This may take a few seconds. Trying to fetch...');

        // Retry fetching QR code
        let retries = 0;
        const maxRetries = 30; // 30 seconds

        while (!finalQRCode && retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          try {
            const qrResponse = await api.get(`/api/v1/whatsapp/sessions/${accountId}/qr`);
            if (qrResponse.data.data.qrCode) {
              finalQRCode = qrResponse.data.data.qrCode;
              setQRCode(finalQRCode);
              setQRError(null);
              break;
            }
          } catch (err) {
            // Continue retrying
            console.log(`QR fetch attempt ${retries + 1}/${maxRetries} failed`);
          }

          retries++;
        }

        if (!finalQRCode) {
          setQRError('Could not generate QR code. Please try again.');
          setScanning(false);
          return;
        }
      } else {
        setQRCode(initialQRCode);
      }

      // Poll for connection status
      // Give user 90 seconds to scan the QR code (don't close modal early)
      let isConnected = false;
      let pollAttempts = 0;
      const maxAttempts = 90; // 90 seconds - give user plenty of time to scan

      while (!isConnected && pollAttempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2 seconds instead of 1

        try {
          const statusResponse = await api.get(`/api/v1/whatsapp/sessions/${accountId}`);
          console.log(`Poll attempt ${pollAttempts + 1}: `, statusResponse.data.data);
          if (statusResponse.data.data.connected) {
            console.log('✅ Connected detected! Closing modal...');
            isConnected = true;
            setScanning(false);
            setShowQRModal(false);
            fetchSessions();
            alert('✅ WhatsApp connected successfully!');
            break;
          }
        } catch (error) {
          // Continue polling
          console.log(`Status poll attempt ${pollAttempts + 1}/${maxAttempts} - Error:`, error);
        }

        pollAttempts++;
      }

      if (!isConnected) {
        // Don't close modal yet - let user try to scan longer
        setScanning(false);
        setQRError('⏱️ Still waiting for QR scan... Please scan the code from your WhatsApp mobile app. You have 90 seconds total.');
        // Keep modal open for manual retry - don't auto-close
        // alert('Connection timeout. Please try again.');
      }
    } catch (error: any) {
      setScanning(false);
      console.error('Error starting session:', error);
      setQRError('Error starting WhatsApp session: ' + (error.response?.data?.error || error.message));
      alert('Error starting WhatsApp session: ' + error.response?.data?.error);
    }
  };

  const handleDisconnect = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp account?')) return;

    try {
      await api.delete(`/api/v1/whatsapp/sessions/${sessionId}`);
      fetchSessions();
      alert('WhatsApp account disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      alert('Error disconnecting account');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-white rounded-lg transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">WhatsApp Accounts</h1>
              <p className="text-gray-600">Connect and manage your WhatsApp accounts for messaging</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Connect WhatsApp
          </button>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No WhatsApp accounts connected. Connect one to get started.
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        session.connected ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      <Phone className={`w-5 h-5 ${session.connected ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{session.phoneNumber}</p>
                      <p className="text-sm text-gray-500">WhatsApp Account</p>
                    </div>
                  </div>

                  {session.connected && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Connected</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={session.connected ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                      {session.connected ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {session.lastLogin && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Login</span>
                      <span className="text-gray-900">
                        {new Date(session.lastLogin).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-500">Connected</span>
                    <span className="text-gray-900">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        if (!session.connected) {
                          // For offline accounts, start a fresh session instead
                          try {
                            const response = await api.post('/api/v1/whatsapp/start-session', {
                              phoneNumber: session.phoneNumber,
                            });
                            
                            const { accountId, qrCode: initialQRCode } = response.data.data;
                            setCurrentAccountId(accountId);
                            setQRCode(initialQRCode);
                            setShowQRModal(true);
                          } catch (error: any) {
                            console.error('Start session error:', error);
                            throw error;
                          }
                        } else {
                          // For connected accounts, just show the QR code
                          const response = await api.get(`/api/v1/whatsapp/sessions/${session.id}/qr`);
                          setQRCode(response.data.data.qrCode);
                          setShowQRModal(true);
                        }
                      } catch (error: any) {
                        console.error('QR button error:', error);
                        const errorMsg = error.response?.data?.error || error.message || 'Network Error';
                        alert('Error: ' + errorMsg);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    {session.connected ? 'QR Code' : 'Re-scan'}
                  </button>
                  <button
                    onClick={async () => {
                      const testPhoneNumber = prompt('Enter phone number to send test message (with country code, e.g., +1234567890):');
                      if (!testPhoneNumber) return;
                      
                      try {
                        const response = await api.post('/api/v1/whatsapp/send-message', {
                          accountId: session.id,
                          phoneNumber: testPhoneNumber,
                          message: `Test message from Broadcaster - ${new Date().toLocaleString()}`,
                        });
                        
                        if (response.data.success) {
                          alert(`✅ Test message sent successfully!\n\nMessage ID: ${response.data.data.messageId}\nService: ${response.data.data.service || 'Baileys'}`);
                        } else {
                          alert('❌ Failed to send message');
                        }
                      } catch (error: any) {
                        alert('❌ Error sending test message: ' + (error.response?.data?.error || error.message));
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded border border-green-200 text-sm"
                  >
                    <span>📤</span>
                    Send Test
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.post(`/api/v1/whatsapp/sessions/${session.id}/resume`);
                        if (response.data.success) {
                          alert(`✅ Resume initiated!\n\n${response.data.data.message}`);
                          // Refresh sessions after 3 seconds
                          setTimeout(() => fetchSessions(), 3000);
                        }
                      } catch (error: any) {
                        alert('❌ Error resuming session: ' + (error.response?.data?.error || error.message));
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 text-sm"
                  >
                    <span>🔄</span>
                    Resume
                  </button>
                  <button
                    onClick={() => handleDisconnect(session.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded border border-red-200 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Connect WhatsApp Account</h2>
            <form onSubmit={handleStartSession}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-2">Include country code (e.g., +1, +44, +91)</p>
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
                  disabled={!phoneNumber || scanning}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {scanning ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>

            {qrError ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 font-semibold mb-2">{qrError}</p>
                  <p className="text-sm text-red-600">
                    This usually means WhatsApp is initializing. Please wait a moment and try again.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      setQRError(null);
                      setQRCode(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      if (currentAccountId) {
                        try {
                          const response = await api.get(`/api/v1/whatsapp/sessions/${currentAccountId}/qr`);
                          setQRCode(response.data.data.qrCode);
                          setQRError(null);
                        } catch (err: any) {
                          setQRError(err.response?.data?.error || 'Failed to load QR code');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              </>
            ) : qrCode ? (
              <>
                {scanning ? (
                  <>
                    <p className="text-gray-600 mb-6">Waiting for WhatsApp connection...</p>
                    <img src={qrCode} alt="QR Code" className="w-64 h-64 mx-auto mb-4 border border-gray-300 rounded" />
                    <p className="text-sm text-gray-500">
                      <strong>Step 1:</strong> Open WhatsApp on your phone
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      <strong>Step 2:</strong> Go to Settings → Linked Devices
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      <strong>Step 3:</strong> Scan this QR code with your phone
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowQRModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="text-green-700 font-semibold">WhatsApp Connected!</p>
                      <p className="text-sm text-green-600 mt-1">Your account is now ready to send messages.</p>
                    </div>
                    <button
                      onClick={() => setShowQRModal(false)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Close
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">Loading QR code...</p>
                <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-green-600 rounded-full mx-auto"></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
