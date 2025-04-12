import React from 'react';
import { Nav } from 'react-bootstrap';
import { LayoutDashboard, AlertTriangle, Database, Settings, LogOut } from 'lucide-react';

const AdminSidebar = ({ activeTab, onTabChange }) => {
    return (
        <div className="sidebar bg-dark text-white" style={{
            width: '250px',
            minHeight: '100vh',
            position: 'sticky',
            top: 0,
            paddingTop: '1rem'
        }}>
            <div className="px-3 py-2 mb-4">
                <h5 className="mb-0 text-white">Admin Panel</h5>
            </div>

            <Nav className="flex-column">
                <Nav.Link
                    onClick={() => onTabChange('dashboard')}
                    className={`d-flex align-items-center px-3 py-2 mb-1 ${activeTab === 'dashboard' ? 'active bg-primary' : 'text-white-50'}`}
                    style={{ cursor: 'pointer' }}
                >
                    <LayoutDashboard size={20} className="me-2" />
                    <span>Dashboard</span>
                </Nav.Link>

                <Nav.Link
                    onClick={() => onTabChange('escalated')}
                    className={`d-flex align-items-center px-3 py-2 mb-1 ${activeTab === 'escalated' ? 'active bg-primary' : 'text-white-50'}`}
                    style={{ cursor: 'pointer' }}
                >
                    <AlertTriangle size={20} className="me-2" />
                    <span>Escalated Cases</span>
                </Nav.Link>

                <Nav.Link
                    onClick={() => onTabChange('resource')}
                    className={`d-flex align-items-center px-3 py-2 mb-1 ${activeTab === 'resource' ? 'active bg-primary' : 'text-white-50'}`}
                    style={{ cursor: 'pointer' }}
                >
                    <Database size={20} className="me-2" />
                    <span>Resource Management</span>
                </Nav.Link>

                <Nav.Link
                    onClick={() => onTabChange('settings')}
                    className={`d-flex align-items-center px-3 py-2 mb-1 ${activeTab === 'settings' ? 'active bg-primary' : 'text-white-50'}`}
                    style={{ cursor: 'pointer' }}
                >
                    <Settings size={20} className="me-2" />
                    <span>Settings</span>
                </Nav.Link>

                <div className="mt-auto">
                    <Nav.Link
                        href="/logout"
                        className="d-flex align-items-center px-3 py-2 text-danger mt-5"
                        style={{ cursor: 'pointer' }}
                    >
                        <LogOut size={20} className="me-2" />
                        <span>Logout</span>
                    </Nav.Link>
                </div>
            </Nav>
        </div>
    );
};

export default AdminSidebar;
