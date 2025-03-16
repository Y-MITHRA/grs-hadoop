// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import Footer from "../shared/Footer";
// import NavBar from "../components/NavBar";
// import { LogIn, ArrowLeft } from "lucide-react";

// // Dummy petitioner for testing
// const petitionerUser = {
//     email: "petitioner@example.com",
//     password: "petitioner123",
//     role: "petitioner",
// };

// const PetitionerLogin = () => {
//     const navigate = useNavigate();
//     const [formData, setFormData] = useState({ email: "", password: "" });
//     const [errors, setErrors] = useState({});
//     const [serverError, setServerError] = useState("");

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     const validateForm = () => {
//         let tempErrors = {};
//         let formIsValid = true;

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

//         // ✅ Check if the user is a valid petitioner
//         if (
//             formData.email === petitionerUser.email &&
//             formData.password === petitionerUser.password
//         ) {
//             // ✅ Store petitioner info in localStorage
//             localStorage.setItem("userType", petitionerUser.role);
//             localStorage.setItem("email", petitionerUser.email);
//             alert("Petitioner Login Successful!");
//             navigate("/login/petitioner/dashboard"); // Redirect petitioner
//         } else {
//             setServerError("Invalid email, password, or access denied.");
//         }
//     };

//     return (
//         <>
//             <NavBar />
//             <div className="container py-4">
//                 <div className="d-flex align-items-center mb-4">
//                     <Link to="/login" className="btn btn-outline-primary me-3">
//                         <ArrowLeft size={18} className="me-1" /> Back
//                     </Link>
//                     <h2 className="mb-0">Petitioner Login</h2>
//                 </div>

//                 <div className="card shadow-sm">
//                     <div className="card-body">
//                         <div className="row mb-4 justify-content-center">
//                             <div className="col-md-6">
//                                 <div className="text-center mb-4">
//                                     <div className="bg-primary d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
//                                         <LogIn size={40} className="text-white" />
//                                     </div>
//                                     <h4>Petitioner Access</h4>
//                                     <p className="text-muted">Enter your credentials to access your account</p>
//                                 </div>

//                                 {serverError && <div className="alert alert-danger">{serverError}</div>}

//                                 <form onSubmit={handleSubmit}>
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

//                                     <div className="d-grid gap-2 mt-4">
//                                         <button type="submit" className="btn btn-primary btn-lg">Login</button>
//                                     </div>
//                                 </form>

//                                 <div className="text-center mt-4">
//                                     <p>Don't have an account? <Link to="/register/petitioner" className="text-primary">Register here</Link></p>
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

// export default PetitionerLogin;


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { LogIn, ArrowLeft } from "lucide-react";

const PetitionerLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        let tempErrors = {};
        let formIsValid = true;

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

        setServerError("");

        try {
            const response = await fetch("http://localhost:5000/api/petitioner/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    role: "petitioner",
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch (err) {
                throw new Error("Invalid server response. Please try again.");
            }

            if (!response.ok) throw new Error(data.message || "Login failed");


            localStorage.setItem("token", data.token);
            localStorage.setItem("userType", data.role);
            navigate("/login/petitioner/dashboard");
        } catch (error) {
            setServerError(error.message);
        }
    };

    return (
        <>
            <NavBar />
            <div className="container py-4">
                <div className="d-flex align-items-center mb-4">
                    <Link to="/login" className="btn btn-outline-primary me-3">
                        <ArrowLeft size={18} className="me-1" /> Back
                    </Link>
                    <h2 className="mb-0">Petitioner Login</h2>
                </div>

                <div className="card shadow-sm">
                    <div className="card-body">
                        <div className="row mb-4 justify-content-center">
                            <div className="col-md-6">
                                <div className="text-center mb-4">
                                    <div className="bg-primary d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
                                        <LogIn size={40} className="text-white" />
                                    </div>
                                    <h4>Petitioner Access</h4>
                                    <p className="text-muted">Enter your credentials to access your account</p>
                                </div>

                                {serverError && <div className="alert alert-danger">{serverError}</div>}

                                {/* ✅ Add form tag */}
                                <form onSubmit={handleSubmit}>
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

                                    <div className="d-grid gap-2 mt-4">
                                        <button type="submit" className="btn btn-primary btn-lg">Login</button>
                                    </div>
                                </form>

                                <div className="text-center mt-4">
                                    <p>Don't have an account? <Link to="/register/petitioner" className="text-primary">Register here</Link></p>
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

export default PetitionerLogin;