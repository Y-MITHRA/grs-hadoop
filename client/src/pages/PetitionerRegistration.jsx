// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import Footer from '../shared/Footer';
// import NavBar from '../components/NavBar';
// import { User, ArrowLeft } from 'lucide-react';

// const PetitionerRegistration = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     firstName: '',
//     lastName: '',
//     email: '',
//     phone: '',
//     address: '',
//     city: '',
//     state: '',
//     pincode: '',
//     password: '',
//     confirmPassword: ''
//   });

//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({
//       ...formData,
//       [name]: value
//     });
//   };

//   const validateForm = () => {
//     let tempErrors = {};
//     let formIsValid = true;

//     if (!formData.firstName.trim()) {
//       tempErrors.firstName = 'First name is required';
//       formIsValid = false;
//     }

//     if (!formData.lastName.trim()) {
//       tempErrors.lastName = 'Last name is required';
//       formIsValid = false;
//     }

//     if (!formData.email.trim()) {
//       tempErrors.email = 'Email is required';
//       formIsValid = false;
//     } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
//       tempErrors.email = 'Email is invalid';
//       formIsValid = false;
//     }

//     if (!formData.phone.trim()) {
//       tempErrors.phone = 'Phone number is required';
//       formIsValid = false;
//     } else if (!/^\d{10}$/.test(formData.phone)) {
//       tempErrors.phone = 'Phone number must be 10 digits';
//       formIsValid = false;
//     }

//     if (!formData.password) {
//       tempErrors.password = 'Password is required';
//       formIsValid = false;
//     } else if (formData.password.length < 6) {
//       tempErrors.password = 'Password must be at least 6 characters';
//       formIsValid = false;
//     }

//     if (formData.password !== formData.confirmPassword) {
//       tempErrors.confirmPassword = 'Passwords do not match';
//       formIsValid = false;
//     }

//     setErrors(tempErrors);
//     return formIsValid;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       // Here you would typically send the data to your backend
//       console.log('Form submitted:', formData);
//       alert('Registration successful! You can now login.');
//       navigate('/login');
//     }
//   };

//   return (
//     <>
//       <NavBar />
//       <div className="container py-4">
//         <div className="d-flex align-items-center mb-4">
//           <Link to="/register" className="btn btn-outline-primary me-3">
//             <ArrowLeft size={18} className="me-1" /> Back
//           </Link>
//           <h2 className="mb-0">Petitioner Registration</h2>
//         </div>

//         <div className="card shadow-sm">
//           <div className="card-body">
//             <div className="row mb-4 justify-content-center">
//               <div className="col-md-8">
//                 <div className="text-center mb-4">
//                   <div className="bg-primary d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '80px', height: '80px' }}>
//                     <User size={40} className="text-white" />
//                   </div>
//                   <h4>Create Your Petitioner Account</h4>
//                   <p className="text-muted">Fill out the form below to register</p>
//                 </div>

//                 <form onSubmit={handleSubmit}>
//                   <div className="row g-3">
//                     <div className="col-md-6">
//                       <label htmlFor="firstName" className="form-label">First Name*</label>
//                       <input
//                         type="text"
//                         className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
//                         id="firstName"
//                         name="firstName"
//                         value={formData.firstName}
//                         onChange={handleChange}
//                       />
//                       {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
//                     </div>

//                     <div className="col-md-6">
//                       <label htmlFor="lastName" className="form-label">Last Name*</label>
//                       <input
//                         type="text"
//                         className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
//                         id="lastName"
//                         name="lastName"
//                         value={formData.lastName}
//                         onChange={handleChange}
//                       />
//                       {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
//                     </div>
//                   </div>

//                   <div className="row g-3 mt-1">
//                     <div className="col-md-6">
//                       <label htmlFor="email" className="form-label">Email*</label>
//                       <input
//                         type="email"
//                         className={`form-control ${errors.email ? 'is-invalid' : ''}`}
//                         id="email"
//                         name="email"
//                         value={formData.email}
//                         onChange={handleChange}
//                       />
//                       {errors.email && <div className="invalid-feedback">{errors.email}</div>}
//                     </div>

//                     <div className="col-md-6">
//                       <label htmlFor="phone" className="form-label">Phone*</label>
//                       <input
//                         type="tel"
//                         className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
//                         id="phone"
//                         name="phone"
//                         value={formData.phone}
//                         onChange={handleChange}
//                       />
//                       {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
//                     </div>
//                   </div>

//                   <div className="mt-3">
//                     <label htmlFor="address" className="form-label">Address</label>
//                     <input
//                       type="text"
//                       className="form-control"
//                       id="address"
//                       name="address"
//                       value={formData.address}
//                       onChange={handleChange}
//                     />
//                   </div>

//                   <div className="row g-3 mt-1">
//                     <div className="col-md-6">
//                       <label htmlFor="city" className="form-label">City</label>
//                       <input
//                         type="text"
//                         className="form-control"
//                         id="city"
//                         name="city"
//                         value={formData.city}
//                         onChange={handleChange}
//                       />
//                     </div>

//                     <div className="col-md-3">
//                       <label htmlFor="state" className="form-label">State</label>
//                       <select
//                         className="form-select"
//                         id="state"
//                         name="state"
//                         value={formData.state}
//                         onChange={handleChange}
//                       >
//                         <option value="">Choose...</option>
//                         <option value="AP">Andhra Pradesh</option>
//                         <option value="AR">Arunachal Pradesh</option>
//                         <option value="AS">Assam</option>
//                         <option value="BR">Bihar</option>
//                         <option value="CG">Chhattisgarh</option>
//                         <option value="GA">Goa</option>
//                         <option value="GJ">Gujarat</option>
//                         <option value="HR">Haryana</option>
//                         <option value="HP">Himachal Pradesh</option>
//                         <option value="JH">Jharkhand</option>
//                         <option value="KA">Karnataka</option>
//                         <option value="KL">Kerala</option>
//                         <option value="MP">Madhya Pradesh</option>
//                         <option value="MH">Maharashtra</option>
//                         <option value="MN">Manipur</option>
//                         <option value="ML">Meghalaya</option>
//                         <option value="MZ">Mizoram</option>
//                         <option value="NL">Nagaland</option>
//                         <option value="OR">Odisha</option>
//                         <option value="PB">Punjab</option>
//                         <option value="RJ">Rajasthan</option>
//                         <option value="SK">Sikkim</option>
//                         <option value="TN">Tamil Nadu</option>
//                         <option value="TG">Telangana</option>
//                         <option value="TR">Tripura</option>
//                         <option value="UP">Uttar Pradesh</option>
//                         <option value="UK">Uttarakhand</option>
//                         <option value="WB">West Bengal</option>
//                       </select>
//                     </div>

//                     <div className="col-md-3">
//                       <label htmlFor="pincode" className="form-label">Pincode</label>
//                       <input
//                         type="text"
//                         className="form-control"
//                         id="pincode"
//                         name="pincode"
//                         value={formData.pincode}
//                         onChange={handleChange}
//                       />
//                     </div>
//                   </div>

//                   <div className="row g-3 mt-3">
//                     <div className="col-md-6">
//                       <label htmlFor="password" className="form-label">Password*</label>
//                       <input
//                         type="password"
//                         className={`form-control ${errors.password ? 'is-invalid' : ''}`}
//                         id="password"
//                         name="password"
//                         value={formData.password}
//                         onChange={handleChange}
//                       />
//                       {errors.password && <div className="invalid-feedback">{errors.password}</div>}
//                     </div>

//                     <div className="col-md-6">
//                       <label htmlFor="confirmPassword" className="form-label">Confirm Password*</label>
//                       <input
//                         type="password"
//                         className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
//                         id="confirmPassword"
//                         name="confirmPassword"
//                         value={formData.confirmPassword}
//                         onChange={handleChange}
//                       />
//                       {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
//                     </div>
//                   </div>

//                   <div className="row mt-4">
//                     <div className="col-12">
//                       <div className="form-check">
//                         <input
//                           className="form-check-input"
//                           type="checkbox"
//                           id="terms"
//                           required
//                         />
//                         <label className="form-check-label" htmlFor="terms">
//                           I agree to the Terms of Service and Privacy Policy
//                         </label>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="d-grid gap-2 mt-4">
//                     <button type="submit" className="btn btn-primary btn-lg">
//                       Register as Petitioner
//                     </button>
//                   </div>
//                 </form>

//                 <div className="text-center mt-4">
//                   <p>
//                     Already have an account? <Link to="/login/petitioner" className="text-primary">Login here</Link>
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//       <Footer />
//     </>
//   );
// };

// export default PetitionerRegistration;


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../shared/Footer';
import NavBar from '../components/NavBar';
import { User, ArrowLeft } from 'lucide-react';

const PetitionerRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
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

    if (validateForm()) {
      try {
        const response = await fetch("http://localhost:5000/api/petitioner/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          alert("Registration successful! You can now login.");
          navigate('/login/petitioner');
        } else {
          alert(data.message || "Registration failed. Please try again.");
        }
      } catch (error) {
        console.error("Error during registration:", error);
        alert("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <>
      <NavBar />
      <div className="container py-4">
        <div className="d-flex align-items-center mb-4">
          <Link to="/register" className="btn btn-outline-primary me-3">
            <ArrowLeft size={18} className="me-1" /> Back
          </Link>
          <h2 className="mb-0">Petitioner Registration</h2>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <div className="row mb-4 justify-content-center">
              <div className="col-md-8">
                <div className="text-center mb-4">
                  <div className="bg-primary d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '80px', height: '80px' }}>
                    <User size={40} className="text-white" />
                  </div>
                  <h4>Create Your Petitioner Account</h4>
                  <p className="text-muted">Fill out the form below to register</p>
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

                  <div className="mt-3">
                    <label htmlFor="address" className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="address"
                      name="address"
                      value={formData.address}
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
                    <button type="submit" className="btn btn-primary btn-lg">
                      Register as Petitioner
                    </button>
                  </div>
                </form>

                <div className="text-center mt-4">
                  <p>
                    Already have an account? <Link to="/login/petitioner" className="text-primary">Login here</Link>
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

export default PetitionerRegistration;