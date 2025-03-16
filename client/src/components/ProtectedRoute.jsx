// import React from "react";
// import { Navigate, Outlet } from "react-router-dom";

// const ProtectedRoute = ({ allowedRoles }) => {
//     const userType = localStorage.getItem("userType"); // Get user role from localStorage

//     return allowedRoles.includes(userType) ? <Outlet /> : <Navigate to="/login" />;
// };

// export default ProtectedRoute;
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
    const token = localStorage.getItem("token");  // ✅ Token Check
    const userType = localStorage.getItem("userType");  // ✅ Role Check

    if (!token || !allowedRoles.includes(userType)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
