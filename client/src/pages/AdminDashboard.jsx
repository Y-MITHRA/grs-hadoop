import React, { useState, useEffect } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import AdminSidebar from '../components/AdminSidebar';
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { Container, Row, Col, Card, Button, Table, Modal, Form } from "react-bootstrap";
import { Bell, User, ChevronDown, Plus, MessageSquare, List, X, Database, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from '../config';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [resourceData, setResourceData] = useState([]);
    const [resourceLoading, setResourceLoading] = useState(true);
    const [resourceError, setResourceError] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [escalatedGrievances, setEscalatedGrievances] = useState([]);
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [escalationResponse, setEscalationResponse] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [newAssignedTo, setNewAssignedTo] = useState('');
    const [officials, setOfficials] = useState([]);
    const [escalatedLoading, setEscalatedLoading] = useState(false);
    const [escalatedError, setEscalatedError] = useState(null);
    const [departmentStats, setDepartmentStats] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState(null);
    const [quickStats, setQuickStats] = useState({
        totalCases: { value: 0, trend: '0%' },
        activeCases: { value: 0, trend: '0%' },
        resolvedCases: { value: 0, trend: '0%' },
        departments: { value: 0, trend: 'Stable' }
    });

    useEffect(() => {
        console.log('Active tab changed to:', activeTab);
        if (activeTab === 'dashboard') {
            fetchResourceData();
            fetchDashboardStats();
            fetchQuickStats();
        } else if (activeTab === 'escalated') {
            fetchEscalatedGrievances();
            fetchOfficials();
        }
    }, [activeTab]);

    const fetchResourceData = async () => {
        try {
            setResourceLoading(true);
            setResourceError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('http://localhost:5000/api/admin/resource-management', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch resource data');
            }

            const data = await response.json();
            setResourceData(data.resources);
        } catch (error) {
            console.error('Error fetching resource data:', error);
            setResourceError('Failed to load resource data');
        } finally {
            setResourceLoading(false);
        }
    };

    const fetchEscalatedGrievances = async () => {
        try {
            setEscalatedLoading(true);
            setEscalatedError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/grievances/escalated`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch escalated grievances');
            }

            const data = await response.json();
            setEscalatedGrievances(data.grievances);
        } catch (error) {
            console.error('Error fetching escalated grievances:', error);
            setEscalatedError('Failed to load escalated grievances');
            toast.error('Failed to load escalated grievances');
        } finally {
            setEscalatedLoading(false);
        }
    };

    const fetchOfficials = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/admin/officials`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch officials');
            }

            const data = await response.json();
            setOfficials(data.officials);
        } catch (error) {
            console.error('Error fetching officials:', error);
            toast.error('Failed to load officials');
        }
    };

    const fetchDashboardStats = async () => {
        try {
            setDashboardLoading(true);
            setDashboardError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Fetch department performance data
            const deptResponse = await fetch(`${API_URL}/admin/department-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!deptResponse.ok) {
                throw new Error('Failed to fetch department statistics');
            }

            const deptData = await deptResponse.json();
            setDepartmentStats(deptData.departmentStats);

            // Fetch monthly trends data
            const monthlyResponse = await fetch(`${API_URL}/admin/monthly-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!monthlyResponse.ok) {
                throw new Error('Failed to fetch monthly statistics');
            }

            const monthlyData = await monthlyResponse.json();
            setMonthlyStats(monthlyData.monthlyStats);

        } catch (error) {
            console.error('Error fetching dashboard statistics:', error);
            setDashboardError('Failed to load dashboard statistics');
            toast.error('Failed to load dashboard statistics');
        } finally {
            setDashboardLoading(false);
        }
    };

    const fetchQuickStats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/admin/quick-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch quick statistics');
            }

            const data = await response.json();
            setQuickStats(data);
        } catch (error) {
            console.error('Error fetching quick statistics:', error);
            toast.error('Failed to load quick statistics');
        }
    };

    const handleRespondToEscalation = async () => {
        try {
            if (!escalationResponse.trim()) {
                toast.error('Please provide a response');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/grievances/${selectedGrievance._id}/escalation-response`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    escalationResponse,
                    newStatus,
                    newAssignedTo
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit escalation response');
            }

            toast.success('Response submitted successfully');
            setShowResponseModal(false);
            setEscalationResponse('');
            setNewStatus('');
            setNewAssignedTo('');
            setSelectedGrievance(null);
            fetchEscalatedGrievances();
        } catch (error) {
            console.error('Error responding to escalation:', error);
            toast.error(error.message || 'Failed to submit response');
        }
    };

    const handleTabChange = (tab) => {
        console.log('Changing tab to:', tab);
        setActiveTab(tab);
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'danger';
            case 'medium':
                return 'warning';
            case 'low':
                return 'success';
            default:
                return 'secondary';
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'resolved':
                return 'success';
            case 'in-progress':
                return 'primary';
            case 'assigned':
                return 'info';
            case 'pending':
                return 'warning';
            default:
                return 'secondary';
        }
    };

    const renderDashboardCharts = () => (
        <Row className="mb-4">
            <Col md={6}>
                <Card className="p-3 shadow-sm">
                    <h6>Department Performance</h6>
                    {dashboardLoading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : dashboardError ? (
                        <div className="alert alert-danger">{dashboardError}</div>
                    ) : (
                        <BarChart
                            width={500}
                            height={300}
                            data={departmentStats}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="department" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="resolved" fill="#28a745" name="Resolved" barSize={50} />
                            <Bar dataKey="pending" fill="#ffc107" name="Pending" barSize={50} />
                            <Bar dataKey="inProgress" fill="#17a2b8" name="In Progress" barSize={50} />
                        </BarChart>
                    )}
                </Card>
            </Col>
            <Col md={6}>
                <Card className="p-3 shadow-sm">
                    <h6>Monthly Trends</h6>
                    {dashboardLoading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : dashboardError ? (
                        <div className="alert alert-danger">{dashboardError}</div>
                    ) : (
                        <LineChart width={400} height={250} data={monthlyStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#007bff" name="Total Cases" />
                            <Line type="monotone" dataKey="resolved" stroke="#28a745" name="Resolved Cases" />
                        </LineChart>
                    )}
                </Card>
            </Col>
        </Row>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <>
                        <Row className="mb-4">
                            <Col>
                                <h2>Admin Dashboard</h2>
                                <p className="text-muted">Welcome to the admin dashboard</p>
                            </Col>
                        </Row>

                        {/* Top Navbar */}
                        <div className="d-flex justify-content-between align-items-center bg-white p-3 shadow-sm mb-3">
                            <h4>Dashboard</h4>
                            <div className="d-flex align-items-center">
                                <Button variant="light" className="me-3 position-relative">
                                    <Bell size={20} />
                                    <span className="badge bg-danger position-absolute top-0 start-100 translate-middle">3</span>
                                </Button>
                                <div className="d-flex align-items-center">
                                    <div className="rounded-circle bg-primary text-white p-2 me-2">A</div>
                                    <span>Admin</span>
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <Row className="mb-4">
                            <Col md={3}>
                                <Card className="p-3 shadow-sm">
                                    <h6 className="text-muted">Total Cases</h6>
                                    <h4>{quickStats.totalCases.value}</h4>
                                    <span className={`text-${quickStats.totalCases.trend.includes("+") ? "success" : "muted"}`}>
                                        {quickStats.totalCases.trend}
                                    </span>
                                </Card>
                            </Col>
                            <Col md={3}>
                                <Card className="p-3 shadow-sm">
                                    <h6 className="text-muted">Active Cases</h6>
                                    <h4>{quickStats.activeCases.value}</h4>
                                    <span className={`text-${quickStats.activeCases.trend.includes("+") ? "warning" : "muted"}`}>
                                        {quickStats.activeCases.trend}
                                    </span>
                                </Card>
                            </Col>
                            <Col md={3}>
                                <Card className="p-3 shadow-sm">
                                    <h6 className="text-muted">Cases Resolved</h6>
                                    <h4>{quickStats.resolvedCases.value}</h4>
                                    <span className={`text-${quickStats.resolvedCases.trend.includes("+") ? "success" : "muted"}`}>
                                        {quickStats.resolvedCases.trend}
                                    </span>
                                </Card>
                            </Col>
                            <Col md={3}>
                                <Card className="p-3 shadow-sm">
                                    <h6 className="text-muted">Departments</h6>
                                    <h4>{quickStats.departments.value}</h4>
                                    <span className="text-muted">{quickStats.departments.trend}</span>
                                </Card>
                            </Col>
                        </Row>

                        {/* Charts */}
                        {renderDashboardCharts()}

                        {/* Resource Management Section */}
                        <Card className="shadow-sm mt-4">
                            <Card.Header>
                                <h6>Department Resource Management</h6>
                            </Card.Header>
                            <Card.Body>
                                {resourceLoading ? (
                                    <div className="text-center">Loading resource data...</div>
                                ) : resourceError ? (
                                    <div className="text-danger">{resourceError}</div>
                                ) : (
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>Department</th>
                                                <th>Grievance ID</th>
                                                <th>Start Date</th>
                                                <th>End Date</th>
                                                <th>Requirements</th>
                                                <th>Funds Required</th>
                                                <th>Resources</th>
                                                <th>Manpower</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resourceData.map((resource) => (
                                                <tr key={resource._id}>
                                                    <td>{resource.department}</td>
                                                    <td className="text-primary">{resource.grievanceId}</td>
                                                    <td>{new Date(resource.startDate).toLocaleDateString()}</td>
                                                    <td>{new Date(resource.endDate).toLocaleDateString()}</td>
                                                    <td>{resource.requirementsNeeded}</td>
                                                    <td>₹{resource.fundsRequired}</td>
                                                    <td>{resource.resourcesRequired}</td>
                                                    <td>{resource.manpowerNeeded}</td>
                                                    <td>
                                                        <span className={`badge bg-${resource.status === 'Completed' ? 'success' : 'warning'}`}>
                                                            {resource.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </>
                );
            case 'escalated':
                return (
                    <Card className="shadow-sm">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Escalated Grievances</h6>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={fetchEscalatedGrievances}
                                disabled={escalatedLoading}
                            >
                                {escalatedLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Loading...
                                    </>
                                ) : (
                                    <>Refresh</>
                                )}
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            {escalatedError ? (
                                <div className="alert alert-danger" role="alert">
                                    <AlertTriangle size={18} className="me-2" />
                                    {escalatedError}
                                </div>
                            ) : escalatedLoading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : escalatedGrievances.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    No escalated grievances found
                                </div>
                            ) : (
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>Grievance ID</th>
                                            <th>Title</th>
                                            <th>Department</th>
                                            <th>Status</th>
                                            <th>Priority</th>
                                            <th>Assigned Official</th>
                                            <th>Created At</th>
                                            <th>Escalated At</th>
                                            <th>Days Since Escalation</th>
                                            <th>Escalation Reason</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {escalatedGrievances.map((grievance) => (
                                            <tr key={grievance._id}>
                                                <td>{grievance.petitionId || 'N/A'}</td>
                                                <td>
                                                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={grievance.title}>
                                                        {grievance.title || 'No Title'}
                                                    </div>
                                                </td>
                                                <td>{grievance.department || 'Unassigned'}</td>
                                                <td>
                                                    <span className={`badge bg-${getStatusBadgeClass(grievance.status)}`}>
                                                        {grievance.status ? grievance.status.charAt(0).toUpperCase() + grievance.status.slice(1) : 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge bg-${getPriorityBadgeClass(grievance.priority)}`}>
                                                        {grievance.priority || 'Not Set'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {grievance.assignedTo ?
                                                        `${grievance.assignedTo.firstName || ''} ${grievance.assignedTo.lastName || ''}`.trim() || 'Unnamed' :
                                                        'Unassigned'
                                                    }
                                                </td>
                                                <td>{grievance.createdAt ? new Date(grievance.createdAt).toLocaleDateString() : 'N/A'}</td>
                                                <td>{grievance.escalatedAt ? new Date(grievance.escalatedAt).toLocaleDateString() : 'N/A'}</td>
                                                <td>
                                                    {grievance.escalatedAt ?
                                                        Math.floor((new Date() - new Date(grievance.escalatedAt)) / (1000 * 60 * 60 * 24)) :
                                                        'N/A'
                                                    }
                                                </td>
                                                <td>
                                                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={grievance.escalationReason}>
                                                        {grievance.escalationReason || 'No reason provided'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedGrievance(grievance);
                                                            setShowResponseModal(true);
                                                        }}
                                                    >
                                                        Respond
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                );
            default:
                return null;
        }
    };

    return (
        <div className="d-flex">
            <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />
            <div className="flex-grow-1">
                <NavBar />
                <Container fluid className="py-3">
                    {renderContent()}
                </Container>
            </div>

            {/* Escalation Response Modal */}
            <Modal show={showResponseModal} onHide={() => setShowResponseModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Respond to Escalation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedGrievance && (
                        <>
                            <div className="mb-3">
                                <h6>Grievance Details</h6>
                                <p><strong>ID:</strong> {selectedGrievance.petitionId}</p>
                                <p><strong>Title:</strong> {selectedGrievance.title}</p>
                                <p><strong>Department:</strong> {selectedGrievance.department}</p>
                                <p><strong>Current Status:</strong> {selectedGrievance.status}</p>
                                <p><strong>Escalation Reason:</strong> {selectedGrievance.escalationReason}</p>
                            </div>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Response</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={escalationResponse}
                                        onChange={(e) => setEscalationResponse(e.target.value)}
                                        placeholder="Enter your response to the escalation"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>New Status</Form.Label>
                                    <Form.Select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                    >
                                        <option value="">Keep Current Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="assigned">Assigned</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Reassign To</Form.Label>
                                    <Form.Select
                                        value={newAssignedTo}
                                        onChange={(e) => setNewAssignedTo(e.target.value)}
                                    >
                                        <option value="">Keep Current Official</option>
                                        {officials.map((official) => (
                                            <option key={official._id} value={official._id}>
                                                {official.firstName} {official.lastName} - {official.department}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Form>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowResponseModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleRespondToEscalation}>
                        Submit Response
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AdminDashboard;
