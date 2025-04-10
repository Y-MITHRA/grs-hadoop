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

    // Mock statistics
    const quickStats = [
        { title: "Total Cases", value: "2,451", trend: "+12%" },
        { title: "Active Cases", value: "342", trend: "+5%" },
        { title: "Cases Resolved", value: "1,887", trend: "+8%" },
        { title: "Departments", value: "15", trend: "Stable" },
    ];

    // Mock department performance data
    const departmentData = [
        { name: "Water", resolved: 45 },
        { name: "RTO", resolved: 30 },
        { name: "Electricity", resolved: 55 },
        { name: "Hospital", resolved: 25 },
        { name: "Road", resolved: 35 },
    ];

    // Mock monthly trends data
    const monthlyTrends = [
        { month: "Jan", cases: 65 },
        { month: "Feb", cases: 75 },
        { month: "Mar", cases: 55 },
        { month: "Apr", cases: 85 },
        { month: "May", cases: 95 },
        { month: "Jun", cases: 75 },
    ];

    // Mock cases data
    const cases = [
        {
            id: "CASE-001",
            title: "Water Supply Issue",
            department: "Water",
            assignedTo: "John Smith",
            status: "In Progress",
            priority: "High",
            lastUpdated: "2024-02-22",
        },
        {
            id: "CASE-002",
            title: "Road Maintenance",
            department: "Road",
            assignedTo: "Sarah Johnson",
            status: "Pending",
            priority: "Medium",
            lastUpdated: "2024-02-21",
        },
    ];

    useEffect(() => {
        fetchResourceData();
        if (activeTab === 'escalated') {
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
            toast.error('Failed to load escalated grievances');
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

    return (
        <div className="d-flex">
            <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex-grow-1">
                <NavBar />
                <Container fluid className="py-3">
                    {activeTab === 'dashboard' ? (
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
                                {quickStats.map((stat, index) => (
                                    <Col md={3} key={index}>
                                        <Card className="p-3 shadow-sm">
                                            <h6 className="text-muted">{stat.title}</h6>
                                            <h4>{stat.value}</h4>
                                            <span className={`text-${stat.trend.includes("+") ? "success" : "muted"}`}>{stat.trend}</span>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>

                            {/* Charts */}
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Card className="p-3 shadow-sm">
                                        <h6>Department Performance</h6>
                                        <BarChart width={400} height={250} data={departmentData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="resolved" fill="#007bff" />
                                        </BarChart>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="p-3 shadow-sm">
                                        <h6>Monthly Trends</h6>
                                        <LineChart width={400} height={250} data={monthlyTrends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="cases" stroke="#28a745" />
                                        </LineChart>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Cases Table */}


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
                    ) : activeTab === 'escalated' ? (
                        <Card className="shadow-sm">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">Escalated Grievances</h6>
                                <Button variant="outline-primary" size="sm" onClick={fetchEscalatedGrievances}>
                                    Refresh
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>Grievance ID</th>
                                            <th>Title</th>
                                            <th>Department</th>
                                            <th>Status</th>
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
                                                <td>{grievance.petitionId}</td>
                                                <td>{grievance.title}</td>
                                                <td>{grievance.department}</td>
                                                <td>
                                                    <span className={`badge bg-${grievance.status === 'resolved' ? 'success' : 'warning'}`}>
                                                        {grievance.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {grievance.assignedTo ?
                                                        `${grievance.assignedTo.firstName} ${grievance.assignedTo.lastName}` :
                                                        'Unassigned'}
                                                </td>
                                                <td>{new Date(grievance.createdAt).toLocaleDateString()}</td>
                                                <td>{new Date(grievance.escalatedAt).toLocaleDateString()}</td>
                                                <td>
                                                    {Math.floor((new Date() - new Date(grievance.escalatedAt)) / (1000 * 60 * 60 * 24))}
                                                </td>
                                                <td>{grievance.escalationReason}</td>
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
                            </Card.Body>
                        </Card>
                    ) : null}
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
