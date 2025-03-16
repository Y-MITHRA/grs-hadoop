import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Footer from '../shared/Footer';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const { user, authenticatedFetch } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        description: '',
        attachments: []
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Pre-fill user data if available
    const [userData] = useState({
        name: user?.name || '',
        email: user?.email || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files) {
            const newAttachments = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    setErrors(prev => ({
                        ...prev,
                        attachments: 'File size should not exceed 5MB'
                    }));
                    return;
                }
                newAttachments.push(file);
            }
            setFormData(prev => ({
                ...prev,
                attachments: newAttachments
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.department) {
            newErrors.department = 'Department is required';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitSuccess(false);

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title.trim());
            formDataToSend.append('department', formData.department);
            formDataToSend.append('description', formData.description.trim());

            // Append each file to FormData
            Array.from(formData.attachments).forEach((file, index) => {
                formDataToSend.append('attachment', file);
            });

            const response = await authenticatedFetch('/api/grievances/submit', {
                method: 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            setSubmitSuccess(true);
            setFormData({
                title: '',
                department: '',
                description: '',
                attachments: []
            });

            // Show success message
            toast.success('Grievance submitted successfully!');
        } catch (error) {
            console.error('Submission error:', error);

            if (error.message === 'Session expired. Please log in again.') {
                setSubmitError('Your session has expired. Please log in again to submit your grievance.');
            } else {
                setSubmitError(error.message || 'Failed to submit grievance. Please try again.');
            }

            toast.error(error.message || 'Failed to submit grievance');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <NavBar />
            <div className="container py-4">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="card shadow">
                            <div className="card-body">
                                <h2 className="text-center mb-4">Submit New Grievance</h2>

                                {submitError && (
                                    <div className="alert alert-danger" role="alert">
                                        {submitError}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    {/* Petitioner Details Section */}
                                    <div className="mb-4">
                                        <h5>Petitioner Details</h5>
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={userData.name}
                                                    disabled
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Email</label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={userData.email}
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grievance Details Section */}
                                    <div className="mb-4">
                                        <h5>Grievance Details</h5>

                                        <div className="mb-3">
                                            <label className="form-label">Title*</label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                placeholder="Enter grievance title"
                                            />
                                            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Department*</label>
                                            <select
                                                className={`form-select ${errors.department ? 'is-invalid' : ''}`}
                                                name="department"
                                                value={formData.department}
                                                onChange={handleChange}
                                            >
                                                <option value="">Select Department</option>
                                                <option value="Water">Water Department</option>
                                                <option value="RTO">RTO</option>
                                                <option value="Electricity">Electricity Department</option>
                                            </select>
                                            {errors.department && <div className="invalid-feedback">{errors.department}</div>}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Description*</label>
                                            <textarea
                                                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                rows="5"
                                                placeholder="Provide detailed description of your grievance"
                                            ></textarea>
                                            {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Attachments</label>
                                            <div className="input-group">
                                                <input
                                                    type="file"
                                                    className={`form-control ${errors.attachments ? 'is-invalid' : ''}`}
                                                    onChange={handleFileChange}
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                    multiple
                                                />
                                                <span className="input-group-text">
                                                    <Upload size={20} />
                                                </span>
                                            </div>
                                            {errors.attachments && <div className="text-danger small mt-1">{errors.attachments}</div>}
                                            <div className="form-text">Max file size: 5MB. Supported formats: PDF, DOC, DOCX, JPG, PNG</div>
                                        </div>
                                    </div>

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-lg"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Grievance'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => navigate('/petitioner/dashboard')}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default SubmitGrievance;
