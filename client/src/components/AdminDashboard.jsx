import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import Dashboard from './Dashboard';
import EscalatedCases from './EscalatedCases';
import ResourceManagement from './ResourceManagement';
import SmartQueryChatbot from './SmartQueryChatbot';
import Settings from './Settings';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const handleTabChange = (tab) => {
        console.log('Active tab changed to:', tab);
        setActiveTab(tab);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'escalated-cases':
                return <EscalatedCases />;
            case 'resource-management':
                return <ResourceManagement />;
            case 'smart-query':
                return <SmartQueryChatbot />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="admin-dashboard">
            <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />
            <div className="dashboard-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminDashboard; 