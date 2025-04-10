import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import AdminSidebar from '../components/AdminSidebar';
import Footer from '../shared/Footer';
import { Container, Row, Col, Form, Table, Badge, Spinner, Modal, Button } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { Eye } from 'lucide-react';

const ResourceManagement = () => {
    const [resourceData, setResourceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [filters, setFilters] = useState({
        department: '',
        status: '',
        priority: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchResourceData();
    }, []);

    const fetchResourceData = async () => {
        try {
            setLoading(true);
            setError(null);

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
            setError('Failed to load resource data');
            toast.error('Failed to load resource data');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleViewDetails = async (resource) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Fetch from the respective department's API
            const response = await fetch(`http://localhost:5000/api/grievances/department/${resource.department}/${resource.grievanceId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch grievance details');
            }

            const data = await response.json();
            setSelectedResource(data.grievance);
            setShowDetails(true);
        } catch (error) {
            console.error('Error fetching grievance details:', error);
            toast.error('Failed to load grievance details');
        }
    };

    const filteredData = resourceData.filter(item => {
        return (
            (!filters.department || item.department === filters.department) &&
            (!filters.status || item.status === filters.status) &&
            (!filters.priority || item.priority === filters.priority) &&
            (!filters.startDate || new Date(item.startDate) >= new Date(filters.startDate)) &&
            (!filters.endDate || new Date(item.endDate) <= new Date(filters.endDate))
        );
    });

    return (
        <div className="d-flex">
            <AdminSidebar />
            <div className="flex-grow-1">
                <NavBar />
                <Container fluid className="py-3">
                    {/* Filters Row */}
                    <Row className="mb-3 g-2">
                        <Col>
                            <Form.Control
                                type="text"
                                placeholder="Search..."
                                name="search"
                                onChange={handleFilterChange}
                            />
                        </Col>
                        <Col>
                            <Form.Select
                                name="department"
                                value={filters.department}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Departments</option>
                                <option value="Water">Water</option>
                                <option value="Electricity">Electricity</option>
                                <option value="RTO">RTO</option>
                            </Form.Select>
                        </Col>
                        <Col>
                            <Form.Select
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </Form.Select>
                        </Col>
                        <Col>
                            <Form.Select
                                name="priority"
                                value={filters.priority}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Priority</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </Form.Select>
                        </Col>
                        <Col>
                            <Form.Control
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                            />
                        </Col>
                        <Col>
                            <Form.Control
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                            />
                        </Col>
                    </Row>

                    {/* Resource Table */}
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                        </div>
                    ) : error ? (
                        <div className="text-danger text-center">{error}</div>
                    ) : (
                        <Table responsive hover className="align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Timeline</th>
                                    <th>Progress</th>
                                    <th>Funds Required</th>
                                    <th>Resources</th>
                                    <th>Manpower</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((resource) => (
                                    <tr key={resource._id}>
                                        <td>{resource.grievanceId}</td>
                                        <td>{resource.title}</td>
                                        <td>
                                            <Badge bg="primary">{resource.department}</Badge>
                                        </td>
                                        <td>
                                            <Badge bg={resource.status === 'completed' ? 'success' : 'warning'}>
                                                {resource.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={
                                                resource.priority === 'high' ? 'danger' :
                                                    resource.priority === 'medium' ? 'warning' : 'info'
                                            }>
                                                {resource.priority}
                                            </Badge>
                                        </td>
                                        <td>
                                            {new Date(resource.startDate).toLocaleDateString()} -
                                            {new Date(resource.endDate).toLocaleDateString()}
                                        </td>
                                        <td>{resource.progress || '0%'}</td>
                                        <td>₹{resource.fundsRequired?.toLocaleString()}</td>
                                        <td>{resource.resourcesRequired}</td>
                                        <td>{resource.manpowerNeeded} Official</td>
                                        <td>
                                            <Button
                                                variant="link"
                                                className="p-0 text-primary"
                                                onClick={() => handleViewDetails(resource)}
                                            >
                                                <Eye size={16} className="me-1" />
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}

                    {/* Details Modal */}
                    <Modal show={showDetails} onHide={() => setShowDetails(false)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Grievance Details</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {selectedResource && (
                                <div className="grievance-details">
                                    <p><strong>ID:</strong> {selectedResource._id}</p>
                                    <p><strong>Title:</strong> {selectedResource.title}</p>
                                    <p><strong>Description:</strong> {selectedResource.description}</p>
                                    <p><strong>Status:</strong> {selectedResource.status}</p>
                                    <p><strong>Priority:</strong> {selectedResource.priority}</p>
                                    <p><strong>Created At:</strong> {new Date(selectedResource.createdAt).toLocaleString()}</p>
                                    <p><strong>Location:</strong> {selectedResource.location}</p>
                                    {selectedResource.assignedTo && (
                                        <p><strong>Assigned To:</strong> {selectedResource.assignedTo.firstName} {selectedResource.assignedTo.lastName}</p>
                                    )}
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowDetails(false)}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Container>
                <Footer />
            </div>
        </div>
    );
};

export default ResourceManagement;
