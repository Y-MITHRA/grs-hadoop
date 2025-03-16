import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../shared/Footer';
import NavBar from '../components/NavBar';
import { FileText, ArrowLeft } from 'lucide-react';
import axios from 'axios';
const OfficialRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    designation: '',
    officeAddress: '',
    city: '',
    state: '',
    pincode: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const validateForm = () => {
    let tempErrors = {};
    let formIsValid = true;
    
    if (!formData.firstName.trim()) {
      tempErrors.firstName = 'First name is required';
      formIsValid = false;
    }
    
    if (!formData.lastName.trim()) {
      tempErrors.lastName = 'Last name is required';
      formIsValid = false;
    }
    
    if (!formData.email.trim()) {
      tempErrors.email = 'Email is required';
      formIsValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Email is invalid';
      formIsValid = false;
    }
    
    if (!formData.phone.trim()) {
      tempErrors.phone = 'Phone number is required';
      formIsValid = false;
    } else if (!/^\d{10}$/.test(formData.phone)) {
      tempErrors.phone = 'Phone number must be 10 digits';
      formIsValid = false;
    }
    
    if (!formData.employeeId.trim()) {
      tempErrors.employeeId = 'Employee ID is required';
      formIsValid = false;
    }
    
    if (!formData.department.trim()) {
      tempErrors.department = 'Department is required';
      formIsValid = false;
    }
    
    if (!formData.designation.trim()) {
      tempErrors.designation = 'Designation is required';
      formIsValid = false;
    }
    
    if (!formData.password) {
      tempErrors.password = 'Password is required';
      formIsValid = false;
    } else if (formData.password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
      formIsValid = false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
      formIsValid = false;
    }
    
    setErrors(tempErrors);
    return formIsValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const response = await axios.post("http://localhost:5000/api/register/official", formData);

        if (response.status === 201) {
            alert("Official registration successful!");
        } else {
            setErrors(response.data.error || "Registration failed.");
        }
    } catch (error) {
        setErrors(error.response?.data?.error || "Server error. Please try again later.");
    }
};
  
  return (
    <>
      <NavBar />
      <div className="container py-4">
        <div className="d-flex align-items-center mb-4">
          <Link to="/register" className="btn btn-outline-success me-3">
            <ArrowLeft size={18} className="me-1" /> Back
          </Link>
          <h2 className="mb-0">Official Registration</h2>
        </div>
        
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row mb-4 justify-content-center">
              <div className="col-md-8">
                <div className="text-center mb-4">
                  <div className="bg-success d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '80px', height: '80px' }}>
                    <FileText size={40} className="text-white" />
                  </div>
                  <h4>Create Your Official Account</h4>
                  <p className="text-muted">Fill out the form below to register as a department official</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="firstName" className="form-label">First Name*</label>
                      <input
                        type="text"
                        className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                      {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="lastName" className="form-label">Last Name*</label>
                      <input
                        type="text"
                        className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                      {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                    </div>
                  </div>
                  
                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label htmlFor="email" className="form-label">Email*</label>
                      <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="phone" className="form-label">Phone*</label>
                      <input
                        type="tel"
                        className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                      {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                    </div>
                  </div>
                  
                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label htmlFor="employeeId" className="form-label">Employee ID*</label>
                      <input
                        type="text"
                        className={`form-control ${errors.employeeId ? 'is-invalid' : ''}`}
                        id="employeeId"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                      />
                      {errors.employeeId && <div className="invalid-feedback">{errors.employeeId}</div>}
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="department" className="form-label">Department*</label>
                      <select
                        className={`form-select ${errors.department ? 'is-invalid' : ''}`}
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
                  </div>
                  
                  <div className="mt-3">
                    <label htmlFor="designation" className="form-label">Designation*</label>
                    <input
                      type="text"
                      className={`form-control ${errors.designation ? 'is-invalid' : ''}`}
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. Department Head, Assistant Director, etc."
                    />
                    {errors.designation && <div className="invalid-feedback">{errors.designation}</div>}
                  </div>
                  
                  <div className="mt-3">
                    <label htmlFor="officeAddress" className="form-label">Office Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="officeAddress"
                      name="officeAddress"
                      value={formData.officeAddress}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label htmlFor="city" className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label htmlFor="state" className="form-label">State</label>
                      <select
                        className="form-select"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                      >
                        <option value="">Choose...</option>
                        <option value="AP">Andhra Pradesh</option>
                        <option value="AR">Arunachal Pradesh</option>
                        <option value="AS">Assam</option>
                        <option value="BR">Bihar</option>
                        <option value="CG">Chhattisgarh</option>
                        <option value="GA">Goa</option>
                        <option value="GJ">Gujarat</option>
                        <option value="HR">Haryana</option>
                        <option value="HP">Himachal Pradesh</option>
                        <option value="JH">Jharkhand</option>
                        <option value="KA">Karnataka</option>
                        <option value="KL">Kerala</option>
                        <option value="MP">Madhya Pradesh</option>
                        <option value="MH">Maharashtra</option>
                        <option value="MN">Manipur</option>
                        <option value="ML">Meghalaya</option>
                        <option value="MZ">Mizoram</option>
                        <option value="NL">Nagaland</option>
                        <option value="OR">Odisha</option>
                        <option value="PB">Punjab</option>
                        <option value="RJ">Rajasthan</option>
                        <option value="SK">Sikkim</option>
                        <option value="TN">Tamil Nadu</option>
                        <option value="TG">Telangana</option>
                        <option value="TR">Tripura</option>
                        <option value="UP">Uttar Pradesh</option>
                        <option value="UK">Uttarakhand</option>
                        <option value="WB">West Bengal</option>
                      </select>
                    </div>
                    
                    <div className="col-md-3">
                      <label htmlFor="pincode" className="form-label">Pincode</label>
                      <input
                        type="text"
                        className="form-control"
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div className="row g-3 mt-3">
                    <div className="col-md-6">
                      <label htmlFor="password" className="form-label">Password*</label>
                      <input
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="confirmPassword" className="form-label">Confirm Password*</label>
                      <input
                        type="password"
                        className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                      {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                    </div>
                  </div>
                  
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="alert alert-info" role="alert">
                        <small>Note: Your registration will be verified by the appropriate department before approval.</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mt-2">
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="terms"
                          required
                        />
                        <label className="form-check-label" htmlFor="terms">
                          I agree to the Terms of Service and Privacy Policy
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="d-grid gap-2 mt-4">
                    <button type="submit" className="btn btn-success btn-lg">
                      Register as Official
                    </button>
                  </div>
                </form>
                
                <div className="text-center mt-4">
                  <p>
                    Already have an account? <Link to="/login/official" className="text-success">Login here</Link>
                  </p>
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

export default OfficialRegistration;