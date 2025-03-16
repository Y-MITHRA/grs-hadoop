import React, { useState } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { Container, Row, Col, Card, Button, Table } from "react-bootstrap";
import { Bell, User, ChevronDown, Plus, MessageSquare, List, X } from "lucide-react";

const AdminDashboard = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

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

    return (
        <>
            <NavBar />
            <div className="d-flex">
                {/* Sidebar */}

                <div className={`bg-white p-3 shadow-sm ${sidebarOpen ? "w-25" : "w-10"} vh-100`}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className={sidebarOpen ? "d-block" : "d-none"}>Admin Panel</h5>
                        <Button variant="light" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <X size={20} /> : <List size={20} />}
                        </Button>
                    </div>

                    <ul className="nav flex-column">
                        <li className="nav-item"><a href="/" className="nav-link">Dashboard</a></li>
                        <li className="nav-item"><a href="/users" className="nav-link">Users</a></li>
                        <li className="nav-item"><a href="/reports" className="nav-link">Reports</a></li>
                        <li className="nav-item"><a href="/settings" className="nav-link">Settings</a></li>
                        <li className="nav-item"><a href="/logout" className="nav-link text-danger">Logout</a></li>
                    </ul>
                </div>

                {/* Main Content */}
                <div className="flex-grow-1 p-3">
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
                    <Card className="shadow-sm">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h6>Active Cases</h6>
                            <Button variant="primary">
                                <Plus size={16} className="me-2" /> Add Case
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive>
                                <thead>
                                    <tr>
                                        <th>Case ID</th>
                                        <th>Title</th>
                                        <th>Department</th>
                                        <th>Assigned To</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Last Updated</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.map((case_) => (
                                        <tr key={case_.id}>
                                            <td className="text-primary">{case_.id}</td>
                                            <td>{case_.title}</td>
                                            <td>{case_.department}</td>
                                            <td>{case_.assignedTo}</td>
                                            <td>
                                                <span className={`badge bg-${case_.status === "In Progress" ? "warning" : "secondary"}`}>
                                                    {case_.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge bg-${case_.priority === "High" ? "danger" : "info"}`}>
                                                    {case_.priority}
                                                </span>
                                            </td>
                                            <td>{case_.lastUpdated}</td>
                                            <td>
                                                <Button variant="outline-primary" size="sm">
                                                    <MessageSquare size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AdminDashboard;
