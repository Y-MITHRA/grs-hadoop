import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.userType)) {
        // User's role is not authorized
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
