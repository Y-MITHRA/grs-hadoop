import React, { useState } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { AlertCircle, Upload, Loader2, CheckCircle } from "lucide-react";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";

const SubmitGrievance = () => {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        department: "",
        subject: "",
        description: "",
        file: null,
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const departments = ["RTO", "Water", "Electricity", "Road", "Hospital"];

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = "Enter a valid email address";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required";
        } else if (!/^\d{10}$/.test(formData.phone)) {
            newErrors.phone = "Enter a valid 10-digit phone number";
        }

        if (!formData.department) newErrors.department = "Select a department";
        if (!formData.subject.trim()) newErrors.subject = "Subject is required";
        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        } else if (formData.description.length < 50) {
            newErrors.description = "Description must be at least 50 characters";
        }

        if (formData.file) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (formData.file.size > maxSize) {
                newErrors.file = "File size must not exceed 5MB";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData((prev) => ({
            ...prev,
            file,
        }));
        if (errors.file) {
            setErrors((prev) => ({
                ...prev,
                file: "",
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus(null);

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
                setSubmitStatus("success");
                setFormData({
                    fullName: "",
                    email: "",
                    phone: "",
                    department: "",
                    subject: "",
                    description: "",
                    file: null,
                });
            } catch (error) {
                setSubmitStatus("error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <>
            <NavBar />
            <Container className="py-5">
                <Row className="justify-content-center">
                    <Col md={8}>
                        <div className="p-4 border rounded shadow bg-white">
                            <h2 className="mb-3">Submit Grievance</h2>
                            <p className="text-muted">
                                Please fill out the form below with your grievance details.
                            </p>

                            {submitStatus === "success" && (
                                <Alert variant="success">
                                    <CheckCircle className="me-2" />
                                    Grievance submitted successfully!
                                </Alert>
                            )}
                            {submitStatus === "error" && (
                                <Alert variant="danger">
                                    <AlertCircle className="me-2" />
                                    Error submitting grievance. Please try again.
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                {/* Full Name */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.fullName}
                                        placeholder="Enter your full name"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.fullName}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Email & Phone */}
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Email *</Form.Label>
                                            <Form.Control
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                isInvalid={!!errors.email}
                                                placeholder="Enter your email"
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.email}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone Number *</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                isInvalid={!!errors.phone}
                                                placeholder="Enter your phone number"
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                {errors.phone}
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Department */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Department *</Form.Label>
                                    <Form.Select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.department}
                                    >
                                        <option value="">Select a department</option>
                                        {departments.map((dept) => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {errors.department}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Subject */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Subject *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.subject}
                                        placeholder="Enter grievance subject"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.subject}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Description */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Description *</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.description}
                                        placeholder="Describe the issue in detail"
                                        rows={4}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.description}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* File Upload */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Supporting Document (Optional)</Form.Label>
                                    <Form.Control type="file" onChange={handleFileChange} />
                                    {errors.file && (
                                        <Alert variant="danger" className="mt-2">
                                            {errors.file}
                                        </Alert>
                                    )}
                                </Form.Group>

                                {/* Submit Button */}
                                <Button variant="primary" type="submit" disabled={isSubmitting} className="w-100">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="spinner-border-sm me-2" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Grievance"
                                    )}
                                </Button>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </Container>
            <Footer />
        </>
    );

};

export default SubmitGrievance;
