// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import Footer from "../shared/Footer";
// import NavBar from "../components/NavBar";
// import { LogIn, ArrowLeft } from "lucide-react";
// import axios from 'axios';
// import { getOfficialDashboard } from "../utils/redirectHelper";
// const OfficialLogin = () => {
//     const navigate = useNavigate();
    
//     const [formData, setFormData] = useState({ 
//         employeeId: "",
//         email: "",
//         password: "",
//         department: ""
//     });

//     const [error, setError] = useState("");
//     const [serverError, setServerError] = useState("");
//     const [errors, setErrors] = useState({}); 

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             const response = await axios.post("http://localhost:5000/api/login/official", formData);

//             if (response.data.token) {
//                 const { token, email ,employeeId } = response.data;

//                 // Store data in localStorage
//                 localStorage.setItem("token", token);
//                 localStorage.setItem("email", email);
//                  localStorage.setItem("employeeId", employeeId); // ✅ Added officialName storage
//                 localStorage.setItem("userType", "official");
//                 localStorage.setItem("isLoggedIn", true);
//                 console.log("Stored in Local Storage:", email,employeeId);
//                 // Manual redirection based on department
//                 if (formData.department === "Water") {
//                     navigate("/official-dashboard/water");
//                 } else if (formData.department === "RTO") {
//                     navigate("/official-dashboard/rto");
//                 } else if (formData.department === "Electricity") {
//                     navigate("/official-dashboard/electricity");
//                 }
//             } else {
//                 setError(response.data.error);
//             }
//         } catch (error) {
//             setError("Login failed. Please check your credentials.");
//         }
//     };
//     return (
//         <>
//             <NavBar />
//             <div className="container py-4">
//                 <div className="d-flex align-items-center mb-4">
//                     <Link to="/login" className="btn btn-outline-success me-3">
//                         <ArrowLeft size={18} className="me-1" /> Back
//                     </Link>
//                     <h2 className="mb-0">Official Login</h2>
//                 </div>

//                 <div className="card shadow-sm">
//                     <div className="card-body">
//                         <div className="row mb-4 justify-content-center">
//                             <div className="col-md-6">
//                                 <div className="text-center mb-4">
//                                     <div className="bg-success d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
//                                         <LogIn size={40} className="text-white" />
//                                     </div>
//                                     <h4>Official Access</h4>
//                                     <p className="text-muted">Enter your credentials to access the official panel</p>
//                                 </div>

//                                 {serverError && <div className="alert alert-danger">{serverError}</div>}

//                                 <form onSubmit={handleSubmit}>
//                                     <div className="mb-3">
//                                         <label htmlFor="employeeId" className="form-label">Employee ID*</label>
//                                         <input
//                                             type="text"
//                                             className={`form-control ${errors.employeeId ? "is-invalid" : ""}`}
//                                             id="employeeId"
//                                             name="employeeId"
//                                             value={formData.employeeId}
//                                             onChange={handleChange}
//                                             placeholder="Enter your Employee ID"
//                                         />
//                                         {errors.employeeId && <div className="invalid-feedback">{errors.employeeId}</div>}
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

//                                     {/* Department Dropdown */}
//                                     <div className="mb-3">
//                                         <label htmlFor="department" className="form-label">Department*</label>
//                                         <select
//                                             className={`form-control ${errors.department ? "is-invalid" : ""}`}
//                                             id="department"
//                                             name="department"
//                                             value={formData.department}
//                                             onChange={handleChange}
//                                         >
//                                             <option value="">Select Department</option>
//                                             <option value="Water">Water</option>
//                                             <option value="RTO">RTO</option>
//                                             <option value="Electricity">Electricity</option>
//                                         </select>
//                                         {errors.department && <div className="invalid-feedback">{errors.department}</div>}
//                                     </div>

//                                     <div className="d-grid gap-2 mt-4">
//                                         <button type="submit" className="btn btn-success btn-lg">Login</button>
//                                     </div>
//                                 </form>

//                                 <div className="text-center mt-4">
//                                     <p>Don't have an account? <Link to="/register/official" className="text-success">Register here</Link></p>
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

// export default OfficialLogin;




import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { LogIn, ArrowLeft } from "lucide-react";
import axios from 'axios';
import { getOfficialDashboard } from "../utils/redirectHelper";

const OfficialLogin = () => {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        employeeId: "",
        email: "",
        password: "",
        department: ""
    });
    const [error, setError] = useState("");
    const [serverError, setServerError] = useState("");
    const [errors, setErrors] = useState({}); 

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/api/login/official", formData);
            
            if (response.data.token) {
                // Log the response data to see its structure
                console.log("Login response:", response.data);
                
                // Store data in localStorage - Make sure we're extracting correct properties
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("email", formData.email); // Use the email from form data
                localStorage.setItem("employeeId", formData.employeeId); // Use the employeeId from form data
                localStorage.setItem("userType", "official");
                localStorage.setItem("isLoggedIn", "true"); // Store as string "true"
                
                console.log("Stored in Local Storage:", 
                  localStorage.getItem("email"), 
                  localStorage.getItem("employeeId")
                );
                
                // Manual redirection based on department
                if (formData.department === "Water") {
                    navigate("/official-dashboard/water");
                } else if (formData.department === "RTO") {
                    navigate("/official-dashboard/rto");
                } else if (formData.department === "Electricity") {
                    navigate("/official-dashboard/electricity");
                }
            } else {
                setError(response.data.error || "Login failed. Unknown error.");
            }
        } catch (error) {
            console.error("Login error:", error);
            setServerError("Login failed. Please check your credentials or try again later.");
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
                                {error && <div className="alert alert-danger">{error}</div>}
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
                                            required
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
                                            required
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
                                            required
                                        />
                                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                    </div>
                                    {/* Department Dropdown */}
                                    <div className="mb-3">
                                        <label htmlFor="department" className="form-label">Department*</label>
                                        <select
                                            className={`form-control ${errors.department ? "is-invalid" : ""}`}
                                            id="department"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            required
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