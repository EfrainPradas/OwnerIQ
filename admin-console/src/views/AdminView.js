import React, { useState } from 'react';
import AdminDashboard from '../components/Admin/AdminDashboard';
import EventLogView from '../components/EventLogView/EventLogView';
import './AdminView.css';

const AdminView = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <AdminDashboard />;
            case 'event-logs':
                return <EventLogView />;
            default:
                return <AdminDashboard />;
        }
    };

    return (
        <div className="admin-view">
            <div className="admin-header">
                <div className="admin-title">
                    <h1>🔐 Admin Console</h1>
                    <p>Gestión y monitoreo de OwnerIQ</p>
                </div>
            </div>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`admin-tab ${activeTab === 'event-logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('event-logs')}
                >
                    📝 Event Logs
                </button>
            </div>

            <div className="admin-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminView;
