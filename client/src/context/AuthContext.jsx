import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);
    const navigate = useNavigate();

    const decodeToken = (token) => {
        if (!token) {
            throw new Error('No token provided');
        }

        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token structure');
            }

            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = atob(base64);
            const decoded = JSON.parse(jsonPayload);

            // Debug log the decoded token
            console.log('Raw decoded token:', decoded);

            // Check if decoded token has required fields
            // Note: The server sends 'id' not '_id'
            if (!decoded || !decoded.id || !decoded.role) {
                console.log('Missing required fields in token:', decoded);
                throw new Error('Invalid token payload');
            }

            // Token already has the correct structure, just return it
            return {
                id: decoded.id,
                role: decoded.role.toLowerCase(),
                exp: decoded.exp
            };
        } catch (error) {
            console.error('Token decode error:', error);
            throw new Error('Invalid token format');
        }
    };

    const isTokenExpiringSoon = (decodedToken) => {
        if (!decodedToken?.exp) return false;
        const expiryTime = decodedToken.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;
        return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes
    };

    const checkTokenExpiration = () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const decoded = decodeToken(token);
        if (!decoded) {
            logout();
            return;
        }

        const expiryTime = decoded.exp * 1000;
        const now = Date.now();

        if (now >= expiryTime) {
            logout();
            return;
        }

        if (isTokenExpiringSoon(decoded)) {
            setTokenExpiryWarning(true);
        } else {
            setTokenExpiryWarning(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            const decoded = decodeToken(token);
            if (decoded && decoded.exp * 1000 > Date.now()) {
                setUser(JSON.parse(storedUser));
            } else {
                logout();
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const interval = setInterval(checkTokenExpiration, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const login = async (userData, token) => {
        try {
            if (!token || typeof token !== 'string') {
                throw new Error('Invalid token provided');
            }

            // Attempt to decode and validate the token
            const decoded = decodeToken(token);
            console.log('Processed token data:', decoded); // For debugging

            // Validate token expiry
            if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
                throw new Error('Token has expired');
            }

            // Store token and user data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            setTokenExpiryWarning(false);

            // Navigate based on user role and department
            switch (userData.role.toLowerCase()) {
                case 'petitioner':
                    navigate('/petitioner/dashboard');
                    break;
                case 'official':
                    if (userData.department) {
                        navigate(`/official-dashboard/${userData.department.toLowerCase()}`);
                    } else {
                        navigate('/official-dashboard');
                    }
                    break;
                case 'admin':
                    navigate('/admin/dashboard');
                    break;
                default:
                    navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setTokenExpiryWarning(false);

        // Navigate based on current user role
        const currentRole = user?.role?.toLowerCase();
        switch (currentRole) {
            case 'petitioner':
                navigate('/login/petitioner');
                break;
            case 'official':
                navigate('/login/official');
                break;
            case 'admin':
                navigate('/login/admin');
                break;
            default:
                navigate('/login');
        }
    };

    const handleApiResponse = async (response) => {
        // Check for token expiration warning
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = decodeToken(token);
            if (decoded && isTokenExpiringSoon(decoded)) {
                setTokenExpiryWarning(true);
            }
        }

        if (!response.ok) {
            let errorMessage = 'An error occurred';
            try {
                const data = await response.json();
                // Handle specific error codes
                switch (data.code) {
                    case 'TOKEN_EXPIRED':
                    case 'TOKEN_INVALID':
                    case 'TOKEN_MISSING':
                    case 'USER_NOT_FOUND':
                        logout();
                        throw new Error('Session expired. Please log in again.');
                    default:
                        errorMessage = data.message || data.error || 'An error occurred';
                }
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || 'An error occurred';
            }
            throw new Error(errorMessage);
        }

        return response;
    };

    const authenticatedFetch = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        if (!token) {
            logout();
            throw new Error('No authentication token found');
        }

        // Check token expiration before making request
        const decoded = decodeToken(token);
        if (decoded && decoded.exp * 1000 <= Date.now()) {
            logout();
            throw new Error('Session expired. Please log in again.');
        }

        // Ensure URL starts with backend server address
        const baseUrl = 'http://localhost:5000';
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
        };

        // Don't override Content-Type if FormData is being sent
        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        return handleApiResponse(response);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            authenticatedFetch,
            tokenExpiryWarning
        }}>
            {tokenExpiryWarning && (
                <div className="fixed top-0 right-0 m-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                    <p>Your session will expire soon. Please save your work and log in again.</p>
                </div>
            )}
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider; 