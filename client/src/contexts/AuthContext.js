import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:5002/api'; // Water Portal server URL

// Configure axios defaults
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to use stored token if available
      const storedToken = localStorage.getItem('token');

      if (storedToken) {
        // For local auth, use session cookies
        const response = await axios.get(`${API_URL}/auth/me`);
        if (response.data) {
          setUser(response.data);
          setToken(storedToken);
          localStorage.setItem('token', storedToken);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } else {
        // No token found
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Get token from Water portal backend (update your API to return a token)
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.user) {
        setUser(response.data.user);

        // Request a token compatible with the main GRS system from our backend
        const tokenResponse = await axios.get(`${API_URL}/auth/token`);
        const mainToken = tokenResponse.data.token;

        setToken(mainToken);
        localStorage.setItem('token', mainToken);

        setIsAuthenticated(true);
        return response.data;
      }
      throw new Error('Login failed');
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password
      });
      if (response.data.user) {
        setUser(response.data.user);

        // Request a token compatible with the main GRS system from our backend 
        const tokenResponse = await axios.get(`${API_URL}/auth/token`);
        const mainToken = tokenResponse.data.token;

        setToken(mainToken);
        localStorage.setItem('token', mainToken);

        setIsAuthenticated(true);
        return response.data;
      }
      throw new Error('Registration failed');
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 