import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to add token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('Current token:', token);

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.log('No token found');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            console.log('Response error data:', error.response.data);

            // Only clear token on 401 Unauthorized errors
            if (error.response.status === 401) {
                console.log('401 Unauthorized - clearing token');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Function to verify token validity
export const isTokenValid = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found in localStorage');
            return false;
        }

        // Make a request to the verify endpoint
        const response = await api.get('/auth/verify', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Token verification response:', response.data);
        return response.data.success === true;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
};

export default api; 