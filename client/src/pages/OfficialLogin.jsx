import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { LogIn, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getRedirectPath } from "../utils/authUtils";

const OfficialLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        employeeId: "",
        email: "",
        password: "",
        department: ""
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    const validateForm = () => {
        let tempErrors = {};
        let formIsValid = true;

        if (!formData.employeeId.trim()) {
            tempErrors.employeeId = "Employee ID is required";
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

        if (!formData.department) {
            tempErrors.department = "Department is required";
            formIsValid = false;
        }

        setErrors(tempErrors);
        return formIsValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const response = await fetch("http://localhost:5000/api/login/official", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                // Pass the token and user data correctly
                await login(data.user, data.token);
            } else {
                setServerError(data.error || "Login failed");
            }
        } catch (error) {
            console.error('Login error:', error);
            setServerError("Server error. Please try again later.");
        }
    };

    return (
        <>
            <NavBar />
            <div className="container py-4">
                <div className="d-flex align-items-center mb-4">
                    <Link to="/login" className="btn btn-outline-success me-3">
                        <ArrowLeft size={18} className="me-1" /> Back
                    </Link>
                    <h2 className="mb-0">Official Login</h2>
                </div>

                <div className="card shadow-sm">
                    <div className="card-body">
                        <div className="row mb-4 justify-content-center">
                            <div className="col-md-6">
                                <div className="text-center mb-4">
                                    <div className="bg-success d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
                                        <LogIn size={40} className="text-white" />
                                    </div>
                                    <h4>Official Access</h4>
                                    <p className="text-muted">Enter your credentials to access the official panel</p>
                                </div>

                                {serverError && <div className="alert alert-danger">{serverError}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="employeeId" className="form-label">Employee ID*</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.employeeId ? "is-invalid" : ""}`}
                                            id="employeeId"
                                            name="employeeId"
                                            value={formData.employeeId}
                                            onChange={handleChange}
                                            placeholder="Enter your Employee ID"
                                        />
                                        {errors.employeeId && <div className="invalid-feedback">{errors.employeeId}</div>}
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

                                    <div className="mb-3">
                                        <label htmlFor="department" className="form-label">Department*</label>
                                        <select
                                            className={`form-control ${errors.department ? "is-invalid" : ""}`}
                                            id="department"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Department</option>
                                            <option value="Water">Water</option>
                                            <option value="RTO">RTO</option>
                                            <option value="Electricity">Electricity</option>
                                        </select>
                                        {errors.department && <div className="invalid-feedback">{errors.department}</div>}
                                    </div>

                                    <div className="d-grid gap-2 mt-4">
                                        <button type="submit" className="btn btn-success btn-lg">Login</button>
                                    </div>
                                </form>

                                <div className="text-center mt-4">
                                    <p>Don't have an account? <Link to="/register/official" className="text-success">Register here</Link></p>
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

export default OfficialLogin;