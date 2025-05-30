import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Plus, Search, Filter, RefreshCw, Eye, MessageCircle, AlertCircle, Clock, ArrowLeft, Star } from "lucide-react";
import moment from 'moment';
import ChatComponent from '../components/ChatComponent';
import TimelineView from '../components/TimelineView';
import "../styles/Chat.css";
import { Modal, Form, Button } from "react-bootstrap";
import { toast } from "react-hot-toast";
import EscalateModal from '../components/EscalateModal';

const PetitionerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, authenticatedFetch } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [message, setMessage] = useState(location.state?.message || null);
    const [messageType] = useState(location.state?.type || 'info');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0
    });
    const [activeTab, setActiveTab] = useState('all');
    const [filteredGrievances, setFilteredGrievances] = useState([]);
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [selectedGrievanceForEscalation, setSelectedGrievanceForEscalation] = useState(null);
    const [escalationReason, setEscalationReason] = useState('');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [selectedGrievanceForFeedback, setSelectedGrievanceForFeedback] = useState(null);

    useEffect(() => {
        fetchGrievances();
        // Clear location state after showing message
        if (location.state?.message) {
            window.history.replaceState({}, document.title);
        }
    }, []);

    useEffect(() => {
        // First filter by status (activeTab)
        let statusFiltered;
        if (activeTab === 'all') {
            statusFiltered = grievances;
        } else if (activeTab === 'assigned') {
            statusFiltered = grievances.filter(g => g.status === 'assigned');
        } else {
            statusFiltered = grievances.filter(g => g.status === activeTab);
        }

        // Then apply search filter
        const searchFiltered = statusFiltered.filter(grievance =>
            grievance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grievance.petitionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grievance.department.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setFilteredGrievances(searchFiltered);
    }, [activeTab, searchTerm, grievances]);

    const fetchGrievances = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await authenticatedFetch(`http://localhost:5000/api/grievances/user/${user.id}`);
            const data = await response.json();

            if (response.ok) {
                // Transform the data to match the expected format
                const transformedGrievances = data.grievances.map(grievance => ({
                    ...grievance,
                    grievanceId: grievance.petitionId || grievance.grievanceId,
                    submittedDate: grievance.createdAt,
                    lastUpdated: grievance.updatedAt,
                    assignedTo: grievance.assignedTo || null,
                    escalationEligible: grievance.escalationEligible || false,
                    isEscalated: grievance.isEscalated || false,
                    resourceManagement: grievance.resourceManagement || null
                }));

                setGrievances(transformedGrievances);

                // Calculate stats
                const stats = {
                    total: transformedGrievances.length,
                    pending: transformedGrievances.filter(g => g.status === 'pending').length,
                    inProgress: transformedGrievances.filter(g => g.status === 'in-progress').length,
                    resolved: transformedGrievances.filter(g => g.status === 'resolved').length
                };
                setStats(stats);
            } else {
                setError(data.error || 'Failed to fetch grievances');
            }
        } catch (error) {
            console.error('Error fetching grievances:', error);
            if (error.message === 'No authentication token available') {
                setError('Your session has expired. Please log in again.');
                setTimeout(() => {
                    navigate('/login/petitioner');
                }, 2000);
            } else {
                setError('Failed to fetch grievances. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetchGrievances();
    };

    const getStatusBadgeClass = (status) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-warning';
            case 'in-progress':
                return 'bg-primary';
            case 'resolved':
                return 'bg-success';
            case 'rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    const handleViewDetails = (grievanceId) => {
        navigate(`/grievance/${grievanceId}`);
    };

    const handleViewChat = (grievance) => {
        setSelectedGrievance(grievance);
        setShowChat(true);
    };

    const handleEscalate = async (grievance) => {
        setSelectedGrievanceForEscalation(grievance);
        setShowEscalateModal(true);
    };

    const handleEscalateSubmit = async (reason) => {
        try {
            const response = await authenticatedFetch(`http://localhost:5000/api/grievances/${selectedGrievanceForEscalation._id}/escalate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ escalationReason: reason }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Grievance escalated successfully');
                fetchGrievances(); // Refresh the list
                setShowEscalateModal(false);
            } else {
                toast.error(data.error || 'Failed to escalate grievance');
            }
        } catch (error) {
            console.error('Error escalating grievance:', error);
            toast.error('Failed to escalate grievance');
        }
    };

    const handleGiveFeedback = async (grievance) => {
        try {
            // First, get the latest grievance data to make sure we have current feedback status
            const response = await authenticatedFetch(`http://localhost:5000/api/grievances/${grievance._id}/status`);

            if (!response.ok) {
                throw new Error('Failed to fetch grievance details');
            }

            const updatedGrievance = await response.json();

            // Check if feedback already exists using the updated data
            if (updatedGrievance.feedback && updatedGrievance.feedback.rating) {
                toast.error('Feedback has already been submitted for this grievance');
                return;
            }

            // If no feedback exists, proceed with showing the modal
            setSelectedGrievanceForFeedback(updatedGrievance);
            setShowFeedbackModal(true);

        } catch (error) {
            console.error('Error fetching grievance details:', error);
            toast.error(error.message || 'Failed to fetch grievance details');
        }
    };

    const submitFeedback = async () => {
        try {
            if (!selectedGrievanceForFeedback) {
                toast.error('No grievance selected for feedback');
                return;
            }

            // More robust check for existing feedback
            if (selectedGrievanceForFeedback.feedback && selectedGrievanceForFeedback.feedback.rating) {
                toast.error('Feedback has already been submitted for this grievance');
                setShowFeedbackModal(false);
                return;
            }

            if (feedbackRating === 0) {
                toast.error('Please select a rating');
                return;
            }

            const response = await authenticatedFetch(`http://localhost:5000/api/grievances/${selectedGrievanceForFeedback._id}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: feedbackRating,
                    comment: feedbackComment
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Thank you for your feedback!');
                setShowFeedbackModal(false);
                setFeedbackRating(0);
                setFeedbackComment('');
                setSelectedGrievanceForFeedback(null);
                fetchGrievances(); // Refresh the list
            } else {
                throw new Error(data.error || 'Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error(error.message || 'Failed to submit feedback');

            // Close the modal for any error containing "already submitted"
            if (error.message && error.message.toLowerCase().includes('already submitted')) {
                setShowFeedbackModal(false);
                setFeedbackRating(0);
                setFeedbackComment('');
                setSelectedGrievanceForFeedback(null);
                // Refresh to get latest data
                fetchGrievances();
            }
        }
    };

    return (
        <>
            <NavBar />
            <div className="container-fluid py-4">
                {/* Header Section */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="mb-0">My Grievances</h2>
                    <button
                        className="btn btn-primary d-flex align-items-center"
                        onClick={() => navigate("/submit-grievance")}
                    >
                        <Plus size={18} className="me-2" />
                        Submit New Grievance
                    </button>
                </div>

                {/* Alert Message */}
                {message && (
                    <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
                        {message}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setMessage(null)}
                        ></button>
                    </div>
                )}

                {/* Stats Section */}
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white">
                            <div className="card-body">
                                <h5 className="card-title">Total Grievances</h5>
                                <h2 className="card-text">{stats.total}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-warning text-dark">
                            <div className="card-body">
                                <h5 className="card-title">Pending</h5>
                                <h2 className="card-text">{stats.pending}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-info text-white">
                            <div className="card-body">
                                <h5 className="card-title">In Progress</h5>
                                <h2 className="card-text">{stats.inProgress}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-success text-white">
                            <div className="card-body">
                                <h5 className="card-title">Resolved</h5>
                                <h2 className="card-text">{stats.resolved}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="row mb-4">
                    <div className="col-md-8">
                        <div className="btn-group" role="group">
                            <button
                                className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('all')}
                            >
                                All
                            </button>
                            <button
                                className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('pending')}
                            >
                                Pending
                            </button>
                            <button
                                className={`btn ${activeTab === 'assigned' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('assigned')}
                            >
                                Assigned
                            </button>
                            <button
                                className={`btn ${activeTab === 'in-progress' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('in-progress')}
                            >
                                In Progress
                            </button>
                            <button
                                className={`btn ${activeTab === 'resolved' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('resolved')}
                            >
                                Resolved
                            </button>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search grievances..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button className="btn btn-outline-secondary" type="button">
                                <i className="bi bi-search"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="alert alert-danger" role="alert">
                        <AlertCircle className="me-2" size={20} />
                        {error}
                    </div>
                )}

                {/* Grievances Table */}
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead className="table-light">
                            <tr>
                                <th>Grievance ID</th>
                                <th>Title</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                                <th>Submitted Date</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredGrievances.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4">
                                        No grievances found
                                    </td>
                                </tr>
                            ) : (
                                filteredGrievances.map((grievance) => (
                                    <tr key={grievance._id}>
                                        <td>{grievance.grievanceId || 'N/A'}</td>
                                        <td>{grievance.title}</td>
                                        <td>{grievance.department}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(grievance.status)}`}>
                                                {grievance.status}
                                            </span>
                                        </td>
                                        <td>
                                            {grievance.assignedTo ?
                                                `${grievance.assignedTo.firstName} ${grievance.assignedTo.lastName}` :
                                                'Not Assigned'
                                            }
                                        </td>
                                        <td>{moment(grievance.createdAt).format('MMM D, YYYY')}</td>
                                        <td>{moment(grievance.updatedAt).format('MMM D, YYYY')}</td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                {(grievance.status === 'assigned' || grievance.status === 'in-progress') && grievance.assignedTo && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleViewChat(grievance)}
                                                    >
                                                        <MessageCircle size={16} className="me-1" />
                                                        Chat
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-info"
                                                    onClick={() => {
                                                        setSelectedGrievance(grievance);
                                                        setShowTimeline(true);
                                                    }}
                                                >
                                                    <Clock size={16} className="me-1" />
                                                    Timeline
                                                </button>
                                                {grievance.status === 'resolved' && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-outline-primary me-2"
                                                            onClick={() => {
                                                                setSelectedGrievance(grievance);
                                                                setShowDocumentModal(true);
                                                            }}
                                                            disabled={!grievance.resolutionDocument}
                                                        >
                                                            <Eye size={16} className="me-1" />
                                                            View Resolution
                                                        </button>
                                                        {!grievance.feedback && (
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => handleGiveFeedback(grievance)}
                                                            >
                                                                <Star size={16} className="me-1" />
                                                                Give Feedback
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {grievance.escalationEligible && !grievance.isEscalated && (
                                                    <button
                                                        className="btn btn-warning btn-sm"
                                                        onClick={() => handleEscalate(grievance)}
                                                    >
                                                        Escalate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Timeline Modal */}
                {showTimeline && selectedGrievance && (
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        Timeline - Grievance {selectedGrievance.grievanceId}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => {
                                            setShowTimeline(false);
                                            setSelectedGrievance(null);
                                        }}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <TimelineView
                                        grievanceId={selectedGrievance.grievanceId}
                                        onBack={() => {
                                            setShowTimeline(false);
                                            setSelectedGrievance(null);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Modal */}
                {showChat && selectedGrievance && (
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <div className="d-flex align-items-center">
                                        <button
                                            type="button"
                                            className="btn btn-link text-dark me-3"
                                            onClick={() => {
                                                setShowChat(false);
                                                setSelectedGrievance(null);
                                            }}
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <h5 className="modal-title mb-0">
                                            Chat - Grievance {selectedGrievance.grievanceId}
                                        </h5>
                                    </div>
                                </div>
                                <div className="modal-body" style={{ height: '500px', padding: 0 }}>
                                    <ChatComponent
                                        grievanceId={selectedGrievance._id}
                                        petitionerId={selectedGrievance.petitioner?._id || selectedGrievance.petitioner}
                                        officialId={selectedGrievance.assignedOfficials?.[0]?._id || selectedGrievance.assignedOfficials?.[0]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resolution Document Modal */}
                {showDocumentModal && selectedGrievance && selectedGrievance.resolutionDocument && (
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <div className="d-flex align-items-center">
                                        <button
                                            type="button"
                                            className="btn btn-link text-dark me-3"
                                            onClick={() => {
                                                setShowDocumentModal(false);
                                                setSelectedGrievance(null);
                                            }}
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <h5 className="modal-title mb-0">
                                            Resolution Document - Grievance {selectedGrievance.grievanceId}
                                        </h5>
                                    </div>
                                </div>
                                <div className="modal-body">
                                    <div className="text-center">
                                        <h6>Document: {selectedGrievance.resolutionDocument.filename}</h6>
                                        <p>Uploaded on: {moment(selectedGrievance.resolutionDocument.uploadedAt).format('MMMM Do YYYY, h:mm a')}</p>
                                        <a
                                            href={`http://localhost:5000/${selectedGrievance.resolutionDocument.path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                        >
                                            View Document
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <EscalateModal
                    isOpen={showEscalateModal}
                    onClose={() => setShowEscalateModal(false)}
                    onSubmit={handleEscalateSubmit}
                    grievanceId={selectedGrievanceForEscalation?._id}
                />

                {/* Rate Your Experience Modal */}
                <Modal
                    show={showFeedbackModal}
                    onHide={() => setShowFeedbackModal(false)}
                    style={{ zIndex: 9999 }}
                    dialogClassName="modal-dialog-centered"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Rate Your Experience</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="mb-4">
                            <p className="mb-3">How would you rate the handling of your grievance?</p>
                            <div className="d-flex justify-content-center gap-3 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <div
                                        key={star}
                                        onClick={() => setFeedbackRating(star)}
                                        style={{ cursor: 'pointer', fontSize: '24px' }}
                                        className={`star-rating ${feedbackRating >= star ? 'text-warning' : 'text-muted'}`}
                                    >
                                        ★
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Form.Group>
                            <Form.Label>Additional Comments (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                placeholder="Share your experience with how your grievance was handled..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowFeedbackModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={submitFeedback}>
                            Submit Feedback
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
            <Footer />
        </>
    );
};

export default PetitionerDashboard;
