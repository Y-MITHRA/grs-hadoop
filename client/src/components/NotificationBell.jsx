import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Badge, Dropdown } from 'react-bootstrap';

const NotificationBell = ({ userId, userRole }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Get auth token
    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // Format relative time
    const getRelativeTime = (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }

        return past.toLocaleDateString();
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/api/notifications/user/${userId}`, {
                headers: getAuthHeader()
            });

            // Handle different response formats
            if (response.data && Array.isArray(response.data)) {
                // If response.data is directly an array of notifications
                setNotifications(response.data);
                // Count unread notifications
                const unread = response.data.filter(n => !n.read).length;
                setUnreadCount(unread);
            } else if (response.data && response.data.notifications) {
                // If response.data has notifications property
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount || 0);
            } else {
                // Default to empty array if format is unexpected
                setNotifications([]);
                setUnreadCount(0);
                console.warn('Unexpected notification response format:', response.data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            if (error.response?.status !== 404) {
                toast.error('Failed to fetch notifications');
            }
            // Set empty state on error
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`, {}, {
                headers: getAuthHeader()
            });
            setNotifications(notifications.map(n =>
                n._id === notificationId ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast.error('Failed to mark notification as read');
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await axios.put(`http://localhost:5000/api/notifications/user/${userId}/read-all`, {}, {
                headers: getAuthHeader()
            });
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            toast.error('Failed to mark all notifications as read');
        }
    };

    // Get notification type style
    const getNotificationStyle = (type) => {
        switch (type) {
            case 'HIGH_PRIORITY':
                return 'danger';
            case 'REASSIGNMENT':
                return 'warning';
            case 'ESCALATION':
                return 'danger';
            case 'CASE_REASSIGNED':
                return 'info';
            case 'GRIEVANCE_ASSIGNED':
                return 'primary';
            case 'GRIEVANCE_UPDATE':
                return 'info';
            case 'GRIEVANCE_REASSIGNED':
                return 'warning';
            case 'ESCALATION_RESPONSE':
                return 'danger';
            default:
                return 'secondary';
        }
    };

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await markAsRead(notification._id);
        }
        // Navigate to the grievance if needed
        if (notification.grievanceId) {
            // Add navigation logic here if needed
            console.log('Navigate to grievance:', notification.grievanceId);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            // Set up polling for new notifications
            const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        }
    }, [userId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShow(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="notification-bell position-relative" ref={dropdownRef}>
            <Dropdown show={show} onToggle={(isOpen) => setShow(isOpen)}>
                <Dropdown.Toggle
                    variant="link"
                    className="text-white p-2 border-0 d-flex align-items-center justify-content-center notification-toggle"
                    style={{
                        backgroundColor: show ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s ease',
                    }}
                >
                    <style>
                        {`
                        .notification-toggle:hover {
                            background-color: rgba(0, 0, 0, 0.1) !important;
                        }
                        `}
                    </style>
                    <Bell size={24} />
                    {unreadCount > 0 && (
                        <Badge
                            bg="danger"
                            className="position-absolute"
                            style={{
                                top: '0',
                                right: '0',
                                transform: 'translate(50%, -50%)',
                                fontSize: '0.7rem',
                                padding: '0.25rem 0.4rem',
                                borderRadius: '50%',
                                minWidth: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '-2px'
                            }}
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Dropdown.Toggle>

                <Dropdown.Menu className="notification-menu p-0" style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
                    <div className="p-2 border-bottom d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Notifications</h6>
                        {notifications && notifications.length > 0 && (
                            <button
                                className="btn btn-link btn-sm text-decoration-none"
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <div className="p-3 text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-3 text-center text-muted">
                            No notifications
                        </div>
                    ) : (
                        <div>
                            {notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`notification-item p-2 border-bottom ${!notification.read ? 'bg-light' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                        <div>
                                            <Badge bg={getNotificationStyle(notification.type)} className="me-2">
                                                {notification.type}
                                            </Badge>
                                            {notification.grievanceId?.petitionId && (
                                                <Badge bg="info" className="me-2">
                                                    ID: {notification.grievanceId.petitionId}
                                                </Badge>
                                            )}
                                        </div>
                                        <small className="text-muted">
                                            {getRelativeTime(notification.createdAt)}
                                        </small>
                                    </div>
                                    <div className="notification-message">
                                        {notification.message}
                                    </div>
                                    <div className="mt-1">
                                        <small className="text-muted">
                                            Notification ID: {notification._id}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
};

export default NotificationBell; 