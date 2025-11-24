import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, MessageSquare, Users, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();

  const stats = [
    {
      title: t('dashboard.totalCampaigns'),
      value: '12',
      icon: Zap,
      color: 'bg-blue-500',
    },
    {
      title: t('dashboard.activeCampaigns'),
      value: '3',
      icon: MessageSquare,
      color: 'bg-green-500',
    },
    {
      title: t('dashboard.totalContacts'),
      value: '5,234',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: t('dashboard.messagesThisMonth'),
      value: '45,678',
      icon: BarChart3,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('app.name')}
          </h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {t('dashboard.welcome')}
          </h2>
          <p className="text-gray-600 mt-2">{t('dashboard.overview')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
