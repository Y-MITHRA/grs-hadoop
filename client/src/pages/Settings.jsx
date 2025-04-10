import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Footer from '../shared/Footer';
import { toast } from 'react-hot-toast';

const Settings = () => {
    const { user, authenticatedFetch } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        department: '',
        id: '',
        contactPreferences: {
            email: true,
            sms: false,
            notifications: true
        }
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                department: user.department || '',
                id: user.employeeId || user.adminId || ''
            }));
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await authenticatedFetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                toast.success('Profile updated successfully');
            }
        } catch (error) {
            toast.error('Failed to update profile');
            console.error('Profile update error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await authenticatedFetch('/api/users/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            if (response.ok) {
                toast.success('Password updated successfully');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            }
        } catch (error) {
            toast.error('Failed to update password');
            console.error('Password update error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleContactPreferences = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await authenticatedFetch('/api/users/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contactPreferences: profileData.contactPreferences
                })
            });

            if (response.ok) {
                toast.success('Contact preferences updated successfully');
            }
        } catch (error) {
            toast.error('Failed to update contact preferences');
            console.error('Contact preferences update error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex flex-column">
            <NavBar />
            <div className="container py-4 flex-grow-1">
                <div className="row">
                    <div className="col-md-3">
                        <div className="card">
                            <div className="list-group list-group-flush">
                                <button
                                    className={`list-group-item list-group-item-action ${activeTab === 'profile' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('profile')}
                                >
                                    Profile Information
                                </button>
                                <button
                                    className={`list-group-item list-group-item-action ${activeTab === 'password' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('password')}
                                >
                                    Password Management
                                </button>
                                <button
                                    className={`list-group-item list-group-item-action ${activeTab === 'preferences' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('preferences')}
                                >
                                    Contact Preferences
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-9">
                        <div className="card">
                            <div className="card-body">
                                {activeTab === 'profile' && (
                                    <form onSubmit={handleProfileUpdate}>
                                        <h3 className="mb-4">Profile Information</h3>
                                        <div className="mb-3">
                                            <label className="form-label">Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={profileData.email}
                                                readOnly
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Department/Role</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={profileData.department || user?.role || ''}
                                                readOnly
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">ID</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={profileData.id}
                                                readOnly
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? 'Updating...' : 'Update Profile'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'password' && (
                                    <form onSubmit={handlePasswordChange}>
                                        <h3 className="mb-4">Password Management</h3>
                                        <div className="mb-3">
                                            <label className="form-label">Current Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">New Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Confirm New Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? 'Updating...' : 'Change Password'}
                                        </button>
                                    </form>
                                )}

                                {activeTab === 'preferences' && (
                                    <form onSubmit={handleContactPreferences}>
                                        <h3 className="mb-4">Contact Preferences</h3>
                                        <div className="mb-3 form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="emailNotifications"
                                                checked={profileData.contactPreferences.email}
                                                onChange={(e) => setProfileData({
                                                    ...profileData,
                                                    contactPreferences: {
                                                        ...profileData.contactPreferences,
                                                        email: e.target.checked
                                                    }
                                                })}
                                            />
                                            <label className="form-check-label" htmlFor="emailNotifications">
                                                Receive Email Notifications
                                            </label>
                                        </div>
                                        <div className="mb-3 form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="smsNotifications"
                                                checked={profileData.contactPreferences.sms}
                                                onChange={(e) => setProfileData({
                                                    ...profileData,
                                                    contactPreferences: {
                                                        ...profileData.contactPreferences,
                                                        sms: e.target.checked
                                                    }
                                                })}
                                            />
                                            <label className="form-check-label" htmlFor="smsNotifications">
                                                Receive SMS Notifications
                                            </label>
                                        </div>
                                        <div className="mb-3 form-check">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="appNotifications"
                                                checked={profileData.contactPreferences.notifications}
                                                onChange={(e) => setProfileData({
                                                    ...profileData,
                                                    contactPreferences: {
                                                        ...profileData.contactPreferences,
                                                        notifications: e.target.checked
                                                    }
                                                })}
                                            />
                                            <label className="form-check-label" htmlFor="appNotifications">
                                                Receive In-App Notifications
                                            </label>
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? 'Updating...' : 'Save Preferences'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Settings;
