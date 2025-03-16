import React, { useState } from "react";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { MessageSquare, Phone, User, Bell, ChevronDown, LogOut } from "lucide-react";
import { Container, Row, Col, Card, Button, Dropdown } from "react-bootstrap";

const CaseCard = ({ caseData, onDragStart }) => {
    const [isCommenting, setIsCommenting] = useState(false);
    const [comment, setComment] = useState("");

    const getPriorityColor = (priority) => {
        switch (priority.toLowerCase()) {
            case "high":
                return "badge bg-danger";
            case "medium":
                return "badge bg-warning text-dark";
            case "low":
                return "badge bg-success";
            default:
                return "badge bg-secondary";
        }
    };

    return (
        <Card className="mb-3 shadow-sm" draggable onDragStart={(e) => onDragStart(e, caseData.id)}>
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                    <h5 className="card-title">{caseData.title}</h5>
                    <span className={getPriorityColor(caseData.priority)}>{caseData.priority}</span>
                </div>

                <p className="text-muted mb-1">Case ID: {caseData.id}</p>
                <p className="text-muted">
                    <User size={16} className="me-1" />
                    {caseData.assignedOfficer}
                </p>

                <div className="d-flex justify-content-between mt-3">
                    <Button variant="outline-secondary" size="sm" onClick={() => setIsCommenting(!isCommenting)}>
                        <MessageSquare size={16} className="me-1" />
                        Comment
                    </Button>
                    <Button variant="outline-primary" size="sm">
                        <Phone size={16} className="me-1" />
                        Contact
                    </Button>
                </div>

                {isCommenting && (
                    <div className="mt-3">
                        <textarea
                            className="form-control"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add your comment..."
                            rows={2}
                        />
                        <div className="d-flex justify-content-end mt-2">
                            <Button variant="light" size="sm" onClick={() => setIsCommenting(false)}>
                                Cancel
                            </Button>
                            <Button variant="success" size="sm" className="ms-2" onClick={() => {
                                setComment("");
                                setIsCommenting(false);
                            }}>
                                Submit
                            </Button>
                        </div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

const OfficialDashboard = () => {
    const [columns, setColumns] = useState({
        assigned: {
            title: "Assigned",
            cases: [
                { id: "CASE-001", title: "Water Supply Issue", priority: "High", assignedOfficer: "John Smith", department: "Water" },
                { id: "CASE-002", title: "Street Light Maintenance", priority: "Medium", assignedOfficer: "Sarah Johnson", department: "Electricity" },
            ],
        },
        inProgress: {
            title: "In Progress",
            cases: [{ id: "CASE-003", title: "Road Repair Request", priority: "High", assignedOfficer: "Mike Wilson", department: "Road" }],
        },
        resolved: {
            title: "Resolved",
            cases: [{ id: "CASE-004", title: "License Renewal Issue", priority: "Low", assignedOfficer: "Emma Davis", department: "RTO" }],
        },
    });

    const [draggedCase, setDraggedCase] = useState(null);

    const handleDragStart = (e, caseId) => {
        setDraggedCase(caseId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, columnId) => {
        e.preventDefault();
        if (!draggedCase) return;

        let sourceColumn, caseData;
        Object.entries(columns).forEach(([colId, column]) => {
            const foundCase = column.cases.find((c) => c.id === draggedCase);
            if (foundCase) {
                sourceColumn = colId;
                caseData = foundCase;
            }
        });

        if (sourceColumn === columnId) return;

        setColumns((prev) => ({
            ...prev,
            [sourceColumn]: {
                ...prev[sourceColumn],
                cases: prev[sourceColumn].cases.filter((c) => c.id !== draggedCase),
            },
            [columnId]: {
                ...prev[columnId],
                cases: [...prev[columnId].cases, caseData],
            },
        }));

        setDraggedCase(null);
    };

    return (
        <>
            <NavBar />
            <Container fluid className="p-4">
                {/* Profile & Notification Section */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="mb-0">Official Dashboard</h2>

                    <div className="d-flex align-items-center">
                        <Button variant="light" className="me-3 position-relative">
                            <Bell size={20} />
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">3</span>
                        </Button>

                        <Dropdown>
                            <Dropdown.Toggle variant="light" className="d-flex align-items-center">
                                <User size={20} className="me-2" />
                                Official
                                <ChevronDown size={16} className="ms-1" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item href="#">Profile</Dropdown.Item>
                                <Dropdown.Item href="#">Settings</Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item href="#" className="text-danger">
                                    <LogOut size={16} className="me-2" /> Logout
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </div>

                {/* Kanban Board */}
                <Row className="d-flex flex-nowrap overflow-auto">
                    {Object.entries(columns).map(([columnId, column]) => (
                        <Col key={columnId} md={4} className="d-flex flex-column p-2" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, columnId)}>
                            <Card className="mb-3 shadow">
                                <Card.Body className="text-center">
                                    <h5 className="mb-0">{column.title}</h5>
                                    <span className="badge bg-secondary">{column.cases.length}</span>
                                </Card.Body>
                            </Card>

                            {column.cases.map((caseData) => (
                                <CaseCard key={caseData.id} caseData={caseData} onDragStart={handleDragStart} />
                            ))}
                        </Col>
                    ))}
                </Row>
            </Container>
            <Footer />
        </>
    );
};

export default OfficialDashboard;
