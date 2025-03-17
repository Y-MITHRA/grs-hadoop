import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Plus, Search, Filter, RefreshCw, Eye, MessageCircle, AlertCircle } from "lucide-react";
import moment from 'moment';

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

    useEffect(() => {
        fetchGrievances();
        // Clear location state after showing message
        if (location.state?.message) {
            window.history.replaceState({}, document.title);
        }
    }, [activeTab]);

    useEffect(() => {
        const filtered = grievances.filter(grievance => {
            const title = grievance.title || '';
            const grievanceId = grievance.petitionId || '';
            const department = grievance.department || '';

            // First apply status filter
            const matchesStatus = activeTab === 'all' || grievance.status === activeTab;

            // Then apply search filter
            const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                grievanceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                department.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesStatus && matchesSearch;
        });
        setFilteredGrievances(filtered);
    }, [searchTerm, grievances, activeTab]);

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
                    grievanceId: grievance.petitionId,
                    submittedDate: grievance.createdAt,
                    lastUpdated: grievance.updatedAt,
                    assignedTo: grievance.assignedTo ? {
                        name: `${grievance.assignedTo.firstName} ${grievance.assignedTo.lastName}`,
                        designation: grievance.assignedTo.designation,
                        department: grievance.assignedTo.department
                    } : null
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

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchTerm(''); // Clear search when changing tabs
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
                                onClick={() => handleTabChange('all')}
                            >
                                All
                            </button>
                            <button
                                className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleTabChange('pending')}
                            >
                                Pending
                            </button>
                            <button
                                className={`btn ${activeTab === 'in-progress' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleTabChange('in-progress')}
                            >
                                In Progress
                            </button>
                            <button
                                className={`btn ${activeTab === 'resolved' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleTabChange('resolved')}
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
                                <Search size={18} />
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
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredGrievances.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4">
                                        No grievances found
                                    </td>
                                </tr>
                            ) : (
                                filteredGrievances.map((grievance) => (
                                    <tr key={grievance._id}>
                                        <td>{grievance.petitionId || 'N/A'}</td>
                                        <td>{grievance.title || 'Untitled'}</td>
                                        <td>{grievance.department || 'N/A'}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(grievance.status)}`}>
                                                {grievance.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            {grievance.assignedTo ? (
                                                <div>
                                                    <div>{grievance.assignedTo.name}</div>
                                                    <small className="text-muted">
                                                        {grievance.assignedTo.designation} - {grievance.assignedTo.department}
                                                    </small>
                                                </div>
                                            ) : 'Not Assigned'}
                                        </td>
                                        <td>{moment(grievance.createdAt).format('MMM D, YYYY')}</td>
                                        <td>{moment(grievance.updatedAt).format('MMM D, YYYY')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default PetitionerDashboard;
