import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../../config';
import TenantsView from './TenantsView';
import LendersView from './LendersView';
import LeasesView from '../../views/LeasesView';

const TABS = [
  { id: 'tenants', label: 'Tenants', icon: 'fa-users' },
  { id: 'leases', label: 'Leases', icon: 'fa-file-contract' },
  { id: 'lenders', label: 'Lenders', icon: 'fa-university' },
];

export default function ClientsView() {
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const resolveAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken && !ENABLE_DEMO_MODE) {
      throw new Error('Authentication required.');
    }
    return accessToken || 'dummy-token';
  }, []);

  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const token = await resolveAuthToken();
      const response = await fetch(`${API_BASE_URL || ''}/api/clients/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Unable to load ${endpoint}`);
      const data = await response.json();
      setter(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      setter([]);
    }
  }, [resolveAuthToken]);

  const refreshTenants = useCallback(() => fetchData('tenants', setTenants), [fetchData]);
  const refreshLenders = useCallback(() => fetchData('lenders', setLenders), [fetchData]);

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([refreshTenants(), refreshLenders()]);
      setIsLoading(false);
    };
    loadAllData();
  }, [refreshLenders, refreshTenants]);

  const renderContent = () => {
    switch (activeTab) {
      case 'tenants':
        return <TenantsView tenants={tenants} setTenants={setTenants} isLoading={isLoading} searchTerm={searchTerm} refreshTenants={refreshTenants} />;
      case 'lenders':
        return <LendersView lenders={lenders} setLenders={setLenders} isLoading={isLoading} searchTerm={searchTerm} refreshLenders={refreshLenders} />;
      case 'leases':
        return <LeasesView />;
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--accent-primary)' }}>
          Clients Management
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--border)',
              background: 'var(--panel-secondary)',
              color: 'var(--text-primary)',
              width: '240px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '500'
            }}
          >
            <i className={`fas ${tab.icon}`} style={{ marginRight: '8px' }}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}