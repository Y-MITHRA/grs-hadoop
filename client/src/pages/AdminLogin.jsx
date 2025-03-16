// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import Footer from "../shared/Footer";
// import NavBar from "../components/NavBar";
// import { Shield, ArrowLeft } from "lucide-react";

// // Dummy admin user for testing
// const adminUser = {
//     adminId: "admin001",
//     email: "admin@example.com",
//     password: "admin123",
//     role: "admin",
// };

// const AdminLogin = () => {
//     const navigate = useNavigate();
//     const [formData, setFormData] = useState({ adminId: "", email: "", password: "" });
//     const [errors, setErrors] = useState({});
//     const [serverError, setServerError] = useState("");

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     const validateForm = () => {
//         let tempErrors = {};
//         let formIsValid = true;

//         if (!formData.adminId.trim()) {
//             tempErrors.adminId = "Admin ID is required";
//             formIsValid = false;
//         }

//         if (!formData.email.trim()) {
//             tempErrors.email = "Email is required";
//             formIsValid = false;
//         } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
//             tempErrors.email = "Invalid email format";
//             formIsValid = false;
//         }

//         if (!formData.password) {
//             tempErrors.password = "Password is required";
//             formIsValid = false;
//         }

//         setErrors(tempErrors);
//         return formIsValid;
//     };

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         if (!validateForm()) return;

//         setServerError(""); // Reset previous errors

//         // ✅ Check admin credentials (Including Admin ID)
//         if (
//             formData.adminId === adminUser.adminId &&
//             formData.email === adminUser.email &&
//             formData.password === adminUser.password
//         ) {
//             // ✅ Store admin info in localStorage
//             localStorage.setItem("userType", adminUser.role);
//             localStorage.setItem("adminId", adminUser.adminId);
//             alert("Admin Login Successful!");
//             navigate("/admin/dashboard"); // Redirect admin
//         } else {
//             setServerError("Invalid Admin ID, Email, or Password.");
//         }
//     };

//     return (
//         <>
//             <NavBar />
//             <div className="container py-4">
//                 <div className="d-flex align-items-center mb-4">
//                     <Link to="/login" className="btn btn-outline-danger me-3">
//                         <ArrowLeft size={18} className="me-1" /> Back
//                     </Link>
//                     <h2 className="mb-0">Admin Login</h2>
//                 </div>

//                 <div className="card shadow-sm">
//                     <div className="card-body">
//                         <div className="row mb-4 justify-content-center">
//                             <div className="col-md-6">
//                                 <div className="text-center mb-4">
//                                     <div className="bg-danger d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
//                                         <Shield size={40} className="text-white" />
//                                     </div>
//                                     <h4>Admin Access</h4>
//                                     <p className="text-muted">Enter your credentials to access the admin panel</p>
//                                 </div>

//                                 {serverError && <div className="alert alert-danger">{serverError}</div>}

//                                 <form onSubmit={handleSubmit}>
//                                     <div className="mb-3">
//                                         <label htmlFor="adminId" className="form-label">Admin ID*</label>
//                                         <input
//                                             type="text"
//                                             className={`form-control ${errors.adminId ? "is-invalid" : ""}`}
//                                             id="adminId"
//                                             name="adminId"
//                                             value={formData.adminId}
//                                             onChange={handleChange}
//                                             placeholder="Enter your Admin ID"
//                                         />
//                                         {errors.adminId && <div className="invalid-feedback">{errors.adminId}</div>}
//                                     </div>

//                                     <div className="mb-3">
//                                         <label htmlFor="email" className="form-label">Email*</label>
//                                         <input
//                                             type="email"
//                                             className={`form-control ${errors.email ? "is-invalid" : ""}`}
//                                             id="email"
//                                             name="email"
//                                             value={formData.email}
//                                             onChange={handleChange}
//                                             placeholder="Enter your email"
//                                         />
//                                         {errors.email && <div className="invalid-feedback">{errors.email}</div>}
//                                     </div>

//                                     <div className="mb-3">
//                                         <label htmlFor="password" className="form-label">Password*</label>
//                                         <input
//                                             type="password"
//                                             className={`form-control ${errors.password ? "is-invalid" : ""}`}
//                                             id="password"
//                                             name="password"
//                                             value={formData.password}
//                                             onChange={handleChange}
//                                             placeholder="Enter your password"
//                                         />
//                                         {errors.password && <div className="invalid-feedback">{errors.password}</div>}
//                                     </div>

//                                     <div className="mb-3 d-flex justify-content-between">
//                                         <div className="form-check">
//                                             <input className="form-check-input" type="checkbox" id="rememberMe" />
//                                             <label className="form-check-label" htmlFor="rememberMe">Remember this device</label>
//                                         </div>
//                                         <Link to="/forgot-password/admin" className="text-danger">Forgot Password?</Link>
//                                     </div>

//                                     <div className="d-grid gap-2 mt-4">
//                                         <button type="submit" className="btn btn-danger btn-lg">Login to Admin Panel</button>
//                                     </div>
//                                 </form>

//                                 <div className="text-center mt-4">
//                                     <p>Need an admin account? <Link to="/register/admin" className="text-danger">Register here</Link></p>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <Footer />
//         </>
//     );
// };

// export default AdminLogin;


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Shield, ArrowLeft } from "lucide-react";

// Dummy admin user for testing
const adminUser = {
    adminId: "admin001",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
};

const AdminLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ adminId: "", email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        let tempErrors = {};
        let formIsValid = true;

        if (!formData.adminId.trim()) {
            tempErrors.adminId = "Admin ID is required";
            formIsValid = false;
        }

        if (!formData.email.trim()) {
            tempErrors.email = "Email is required";
            formIsValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            tempErrors.email = "Invalid email format";
            formIsValid = false;
        }

        if (!formData.password) {
            tempErrors.password = "Password is required";
            formIsValid = false;
        }

        setErrors(tempErrors);
        return formIsValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setServerError(""); // Reset previous errors

        try {
            const response = await fetch("http://localhost:5000/api/admin/login", {  // 🔹 Replace with your actual backend URL
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("userType", "admin");
                localStorage.setItem("adminId", data.adminId);
                alert("Admin Login Successful!");
                navigate("/admin/dashboard"); // Redirect admin
            } else {
                setServerError(data.message || "Invalid Admin ID, Email, or Password.");
            }
        } catch (error) {
            setServerError("Server error. Please try again later.");
        }
    };


    return (
        <>
            <NavBar />
            <div className="container py-4">
                <div className="d-flex align-items-center mb-4">
                    <Link to="/login" className="btn btn-outline-danger me-3">
                        <ArrowLeft size={18} className="me-1" /> Back
                    </Link>
                    <h2 className="mb-0">Admin Login</h2>
                </div>

                <div className="card shadow-sm">
                    <div className="card-body">
                        <div className="row mb-4 justify-content-center">
                            <div className="col-md-6">
                                <div className="text-center mb-4">
                                    <div className="bg-danger d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
                                        <Shield size={40} className="text-white" />
                                    </div>
                                    <h4>Admin Access</h4>
                                    <p className="text-muted">Enter your credentials to access the admin panel</p>
                                </div>

                                {serverError && <div className="alert alert-danger">{serverError}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="adminId" className="form-label">Admin ID*</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.adminId ? "is-invalid" : ""}`}
                                            id="adminId"
                                            name="adminId"
                                            value={formData.adminId}
                                            onChange={handleChange}
                                            placeholder="Enter your Admin ID"
                                        />
                                        {errors.adminId && <div className="invalid-feedback">{errors.adminId}</div>}
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label">Email*</label>
                                        <input
                                            type="email"
                                            className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email"
                                        />
                                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label">Password*</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                        />
                                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                    </div>

                                    <div className="mb-3 d-flex justify-content-between">
                                        <div className="form-check">
                                            <input className="form-check-input" type="checkbox" id="rememberMe" />
                                            <label className="form-check-label" htmlFor="rememberMe">Remember this device</label>
                                        </div>
                                        <Link to="/forgot-password/admin" className="text-danger">Forgot Password?</Link>
                                    </div>

                                    <div className="d-grid gap-2 mt-4">
                                        <button type="submit" className="btn btn-danger btn-lg">Login to Admin Panel</button>
                                    </div>
                                </form>

                                <div className="text-center mt-4">
                                    <p>Need an admin account? <Link to="/register/admin" className="text-danger">Register here</Link></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AdminLogin;