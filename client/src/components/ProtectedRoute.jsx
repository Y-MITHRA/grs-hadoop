import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
    const { user } = useAuth();

    console.log('ProtectedRoute check:', {
        hasUser: !!user,
        user,
        allowedRoles,
        currentPath: window.location.pathname
    });

    if (!user) {
        // Not logged in
        console.log('No user found, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    // Check if user's role is in the allowed roles (case-insensitive)
    const userRole = user.role?.toLowerCase();
    const allowedLowerRoles = allowedRoles.map(role => role.toLowerCase());

    console.log('Role check:', {
        userRole,
        allowedLowerRoles,
        hasAccess: allowedLowerRoles.includes(userRole)
    });

    if (!allowedLowerRoles.includes(userRole)) {
        console.log('Access denied:', { userRole: user.role, allowedRoles });
        // User's role is not authorized
        return <Navigate to="/" replace />;
    }

    // Access granted
    console.log('Access granted for path:', window.location.pathname);
    return <Outlet />;
};

export default ProtectedRoute;
