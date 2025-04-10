
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../shared/Footer';
import NavBar from '../components/NavBar';
import { Shield, ArrowLeft } from 'lucide-react';

const AdminRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    adminId: '',
    position: '',
    securityKey: '',
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

    if (!formData.adminId.trim()) {
      tempErrors.adminId = 'Admin ID is required';
      formIsValid = false;
    }

    if (!formData.position.trim()) {
      tempErrors.position = 'Position is required';
      formIsValid = false;
    }

    if (!formData.password) {
      tempErrors.password = 'Password is required';
      formIsValid = false;
    } else if (formData.password.length < 8) {
      tempErrors.password = 'Password must be at least 8 characters';
      formIsValid = false;
    } else if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/.test(formData.password)) {
      tempErrors.password = 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character';
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

    if (validateForm()) {
      try {
        const response = await fetch('http://localhost:5000/api/admin/register', {  // Use your actual backend URL
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),  // Ensure formData contains username, email, password
        });

        const data = await response.json();

        if (response.ok) {
          alert('Registration successful! You can login.');
          navigate('/login/admin'); // Redirect to login after successful registration
        } else {
          alert(data.message || 'Registration failed. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('An error occurred while submitting the form.');
      }
    }
  };


  return (
    <>
      <NavBar />
      <div className="container py-4">
        <div className="d-flex align-items-center mb-4">
          <Link to="/register" className="btn btn-outline-danger me-3">
            <ArrowLeft size={18} className="me-1" /> Back
          </Link>
          <h2 className="mb-0">Master Controller Registration</h2>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row mb-4 justify-content-center">
              <div className="col-md-8">
                <div className="text-center mb-4">
                  <div className="bg-danger d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '80px', height: '80px' }}>
                    <Shield size={40} className="text-white" />
                  </div>
                  <h4>Create Your Master Controller Account</h4>
                  <p className="text-muted">Registration as Master Controller requires approval</p>
                </div>

                <div className="alert alert-warning" role="alert">
                  <strong>Important:</strong> Master Controller accounts have full administrative access to the system. Registration requires a valid security key and will be subject to verification.
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
                      <label htmlFor="adminId" className="form-label">Admin ID*</label>
                      <input
                        type="text"
                        className={`form-control ${errors.adminId ? 'is-invalid' : ''}`}
                        id="adminId"
                        name="adminId"
                        value={formData.adminId}
                        onChange={handleChange}
                        placeholder="e.g. ADM0001"
                      />
                      {errors.adminId && <div className="invalid-feedback">{errors.adminId}</div>}
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="position" className="form-label">Position*</label>
                      <input
                        type="text"
                        className={`form-control ${errors.position ? 'is-invalid' : ''}`}
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        placeholder="e.g. System Administrator, IT Director"
                      />
                      {errors.position && <div className="invalid-feedback">{errors.position}</div>}
                    </div>
                  </div>

                  {/* <div className="mt-3"> */}
                    {/* <label htmlFor="securityKey" className="form-label">Security Key*</label> */}
                    {/* <input
                      type="password"
                      className={`form-control ${errors.securityKey ? 'is-invalid' : ''}`}
                      id="securityKey"
                      name="securityKey"
                      value={formData.securityKey}
                      onChange={handleChange}
                      placeholder="Enter your administrator security key"
                    /> */}
                    {/* {errors.securityKey && <div className="invalid-feedback">{errors.securityKey}</div>}
                    <small className="form-text text-muted">The security key is provided by existing administrators.</small>
                  </div> */}

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
                      <small className="form-text text-muted">Password must be at least 8 characters and include uppercase, lowercase, number, and special character.</small>
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
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="terms"
                          required
                        />
                        <label className="form-check-label" htmlFor="terms">
                          I agree to the Terms of Service, Privacy Policy, and Security Protocols
                        </label>
                      </div>

                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="responsibility"
                          required
                        />
                        <label className="form-check-label" htmlFor="responsibility">
                          I understand the responsibilities and security implications of master controller access
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="d-grid gap-2 mt-4">
                    <button type="submit" className="btn btn-danger btn-lg">
                      Submit Registration Request
                    </button>
                  </div>
                </form>

                <div className="text-center mt-4">
                  <p>
                    Already have an account? <Link to="/login/admin" className="text-danger">Login here</Link>
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

export default AdminRegistration;