import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Footer from '../shared/Footer';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LocationDropdowns from '../components/LocationDropdowns';

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const { user, authenticatedFetch } = useAuth();
    const [activeTab, setActiveTab] = useState('form'); // 'form' or 'document'
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        description: '',
        taluk: '',
        district: '',
        division: '',
        attachments: []
    });
    const [documentFile, setDocumentFile] = useState(null);
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
        // Clear any errors for this field
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
            if (activeTab === 'form') {
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
            } else {
                const file = files[0];
                if (file.size > 5 * 1024 * 1024) {
                    setErrors(prev => ({
                        ...prev,
                        document: 'File size should not exceed 5MB'
                    }));
                    return;
                }
                // Check file type
                const fileType = file.type;
                if (!fileType.match(/^(image\/(jpeg|png|jpg)|application\/pdf)$/)) {
                    setErrors(prev => ({
                        ...prev,
                        document: 'Only PDF, JPG, and PNG files are supported'
                    }));
                    return;
                }
                setDocumentFile(file);
                // Clear any existing document error
                if (errors.document) {
                    setErrors(prev => ({
                        ...prev,
                        document: ''
                    }));
                }
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Common validations for both form and document
        if (activeTab === 'form' && !formData.department) {
            newErrors.department = 'Department is required';
        }

        // Form-specific validations
        if (activeTab === 'form') {
            if (!formData.title.trim()) {
                newErrors.title = 'Title is required';
            }
            if (!formData.description.trim()) {
                newErrors.description = 'Description is required';
            }
            if (!formData.taluk.trim()) {
                newErrors.taluk = 'Taluk is required';
            }
            if (!formData.district.trim()) {
                newErrors.district = 'District is required';
            }
            if (!formData.division.trim()) {
                newErrors.division = 'Division is required';
            }
        }
        // Document-specific validations
        else {
            if (!documentFile) {
                newErrors.document = 'Please upload a document';
            }
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
            let response;
            // Form-based submission
            if (activeTab === 'form') {
                const formDataToSubmit = new FormData();

                // Add JSON data
                formDataToSubmit.append('title', formData.title);
                formDataToSubmit.append('description', formData.description);
                formDataToSubmit.append('department', formData.department);
                formDataToSubmit.append('district', formData.district);
                formDataToSubmit.append('division', formData.division);
                formDataToSubmit.append('taluk', formData.taluk);

                // Add attachments
                if (formData.attachments && formData.attachments.length > 0) {
                    for (let i = 0; i < formData.attachments.length; i++) {
                        formDataToSubmit.append('attachments', formData.attachments[i]);
                    }
                }

                console.log('Submitting form grievance with data and attachments');
                response = await authenticatedFetch('/api/grievances/with-attachments', {
                    method: 'POST',
                    body: formDataToSubmit
                });
            }
            // Document-based submission
            else {
                const formDataToSubmit = new FormData();
                formDataToSubmit.append('document', documentFile);
                formDataToSubmit.append('fileType', documentFile.type); // Add file type information

                console.log('Submitting document grievance with data:', {
                    fileType: documentFile.type
                });
                response = await authenticatedFetch('/api/grievances/document', {
                    method: 'POST',
                    body: formDataToSubmit
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.details || 'Failed to submit grievance');
            }

            const data = await response.json();
            console.log('Server response:', data);

            if (data.message === 'Grievance created successfully' || data.message === 'Document processed successfully') {
                setSubmitSuccess(true);
                setFormData({
                    title: '',
                    department: '',
                    description: '',
                    taluk: '',
                    district: '',
                    division: '',
                    attachments: []
                });
                setDocumentFile(null);
                toast.success('Grievance submitted successfully!');

                // Show extracted information if available
                if (data.extractedData) {
                    toast.success('Successfully extracted information from document');
                }

                setTimeout(() => {
                    navigate('/petitioner/dashboard', {
                        state: {
                            message: 'Grievance submitted successfully!',
                            type: 'success'
                        }
                    });
                }, 1500);
            }
        } catch (error) {
            console.error('Submission error:', error);
            const errorMessage = error.message === 'Session expired. Please log in again.'
                ? 'Your session has expired. Please log in again to submit your grievance.'
                : error.message || 'Failed to submit grievance. Please try again.';

            setSubmitError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLocationChange = ({ district, division, taluk }) => {
        setFormData(prev => ({
            ...prev,
            district,
            division,
            taluk
        }));
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

                                {/* Tab Navigation */}
                                <div className="nav nav-tabs mb-4" role="tablist">
                                    <button
                                        className={`nav-link ${activeTab === 'form' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('form')}
                                        type="button"
                                    >
                                        <FileText className="me-2" size={18} />
                                        Fill Form
                                    </button>
                                    <button
                                        className={`nav-link ${activeTab === 'document' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('document')}
                                        type="button"
                                    >
                                        <Upload className="me-2" size={18} />
                                        Upload Document
                                    </button>
                                </div>

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

                                    {/* Form-based Input */}
                                    {activeTab === 'form' && (
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
                                                <LocationDropdowns
                                                    onLocationChange={handleLocationChange}
                                                    initialValues={{
                                                        district: formData.district,
                                                        division: formData.division,
                                                        taluk: formData.taluk
                                                    }}
                                                />
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
                                                <label className="form-label">Additional Attachments</label>
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
                                    )}

                                    {/* Document Upload */}
                                    {activeTab === 'document' && (
                                        <div className="mb-4">
                                            <h5>Document Upload</h5>
                                            <div className="alert alert-info">
                                                <p className="mb-0">Supported document types:</p>
                                                <ul className="mb-0">
                                                    <li>Handwritten Tamil</li>
                                                    <li>Digitalized Tamil text</li>
                                                    <li>Digitalized English text</li>
                                                    <li>Handwritten English text</li>
                                                </ul>
                                                <p className="mt-2 mb-0"><strong>Note:</strong> Location details (taluk, district, division) will be automatically extracted from the document.</p>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label">Document*</label>
                                                <input
                                                    type="file"
                                                    className={`form-control ${errors.document ? 'is-invalid' : ''}`}
                                                    onChange={handleFileChange}
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp"
                                                />
                                                {errors.document && <div className="invalid-feedback">{errors.document}</div>}
                                                <div className="form-text">
                                                    Supported formats: PDF, Word, Images (jpg, png, etc.)
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
