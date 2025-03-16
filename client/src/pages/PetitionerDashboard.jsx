import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Plus, Search, Filter, RefreshCw } from "lucide-react";

const PetitionerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [message, setMessage] = useState(location.state?.message || null);
    const [messageType] = useState(location.state?.type || 'info');

    useEffect(() => {
        fetchGrievances();
        // Clear location state after showing message
        if (location.state?.message) {
            window.history.replaceState({}, document.title);
        }
    }, []);

    const fetchGrievances = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/grievances/petitioner', {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            const data = await response.json();
            
            if (response.ok) {
                setGrievances(data);
            } else {
                setError(data.message || 'Failed to fetch grievances');
            }
        } catch (error) {
            setError('Error fetching grievances. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetchGrievances();
    };

    const filteredGrievances = grievances
        .filter(grievance => {
            if (filterStatus === "all") return true;
            return grievance.status.toLowerCase() === filterStatus;
        })
        .filter(grievance =>
            grievance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grievance.petitionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            grievance.department.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const getStatusBadgeClass = (status) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-warning';
            case 'assigned':
                return 'bg-info';
            case 'in-progress':
                return 'bg-primary';
            case 'resolved':
                return 'bg-success';
            default:
                return 'bg-secondary';
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

                {/* Filters and Search */}
                <div className="row mb-4">
                    <div className="col-md-6 mb-3 mb-md-0">
                        <div className="input-group">
                            <span className="input-group-text">
                                <Search size={18} />
                            </span>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search grievances..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="input-group">
                            <span className="input-group-text">
                                <Filter size={18} />
                            </span>
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="assigned">Assigned</option>
                                <option value="in-progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <button 
                            className="btn btn-outline-secondary w-100" 
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            <RefreshCw size={18} className={loading ? "spinner" : ""} />
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {/* Grievances Table */}
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead className="table-light">
                            <tr>
                                <th>Petition ID</th>
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
                                    <tr key={grievance.petitionId} style={{ cursor: 'pointer' }}>
                                        <td>{grievance.petitionId}</td>
                                        <td>{grievance.title}</td>
                                        <td>{grievance.department}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(grievance.status)}`}>
                                                {grievance.status}
                                            </span>
                                        </td>
                                        <td>{grievance.assignedTo || 'Not Assigned'}</td>
                                        <td>{new Date(grievance.createdAt).toLocaleDateString()}</td>
                                        <td>{new Date(grievance.updatedAt).toLocaleDateString()}</td>
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
