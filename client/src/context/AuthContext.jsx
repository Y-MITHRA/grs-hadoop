import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');
        const email = localStorage.getItem('email');
        const name = localStorage.getItem('name');
        const employeeId = localStorage.getItem('employeeId');
        const adminId = localStorage.getItem('adminId');

        if (token && userType) {
            setUser({
                token,
                userType,
                email,
                name,
                ...(userType === 'official' && { employeeId }),
                ...(userType === 'admin' && { adminId })
            });
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        const { token, userType, email, name, employeeId, adminId } = userData;
        
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('userType', userType);
        localStorage.setItem('email', email);
        if (name) localStorage.setItem('name', name);
        if (employeeId) localStorage.setItem('employeeId', employeeId);
        if (adminId) localStorage.setItem('adminId', adminId);

        // Update context
        setUser(userData);
    };

    const logout = () => {
        // Clear localStorage
        localStorage.clear();
        // Clear context
        setUser(null);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}; 