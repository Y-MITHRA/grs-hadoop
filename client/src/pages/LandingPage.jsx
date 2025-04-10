import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import TrackGrievance from '../components/TrackGrievance';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-vh-100">
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
                <Container>
                    <a className="navbar-brand" href="/">Grievance Redressal System</a>
                    <div className="d-flex">
                        <button
                            className="btn btn-outline-light me-2"
                            onClick={() => navigate('/login/petitioner')}
                        >
                            Petitioner Login
                        </button>
                        <button
                            className="btn btn-outline-light"
                            onClick={() => navigate('/login/official')}
                        >
                            Official Login
                        </button>
                    </div>
                </Container>
            </nav>

            <Container className="py-5">
                <Row className="mb-5">
                    <Col md={6} className="text-center text-md-start">
                        <h1 className="display-4 mb-4">Welcome to GRS</h1>
                        <p className="lead mb-4">
                            A platform dedicated to addressing and resolving your grievances efficiently.
                            Submit, track, and get timely updates on your complaints.
                        </p>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => navigate('/register/petitioner')}
                        >
                            Register Now
                        </button>
                    </Col>
                    <Col md={6} className="d-flex align-items-center justify-content-center">
                        <img
                            src="/images/grievance.svg"
                            alt="Grievance Portal"
                            className="img-fluid"
                            style={{ maxHeight: '300px' }}
                        />
                    </Col>
                </Row>

                <Row className="mb-5">
                    <Col>
                        <Card className="border-0 shadow-sm">
                            <Card.Body>
                                <TrackGrievance />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Row className="mb-5">
                    <Col xs={12} className="text-center mb-4">
                        <h2>Our Services</h2>
                    </Col>
                    <Col md={4} className="mb-4">
                        <Card className="h-100 shadow-sm">
                            <Card.Body className="text-center">
                                <div className="mb-3">
                                    <i className="bi bi-file-earmark-text display-4 text-primary"></i>
                                </div>
                                <Card.Title>Submit Grievances</Card.Title>
                                <Card.Text>
                                    Easily submit your grievances through our user-friendly platform
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4} className="mb-4">
                        <Card className="h-100 shadow-sm">
                            <Card.Body className="text-center">
                                <div className="mb-3">
                                    <i className="bi bi-clock-history display-4 text-primary"></i>
                                </div>
                                <Card.Title>Track Progress</Card.Title>
                                <Card.Text>
                                    Monitor the status and progress of your submitted grievances
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4} className="mb-4">
                        <Card className="h-100 shadow-sm">
                            <Card.Body className="text-center">
                                <div className="mb-3">
                                    <i className="bi bi-chat-dots display-4 text-primary"></i>
                                </div>
                                <Card.Title>Direct Communication</Card.Title>
                                <Card.Text>
                                    Communicate directly with officials handling your case
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            <footer className="bg-dark text-light py-4">
                <Container>
                    <Row>
                        <Col className="text-center">
                            <p className="mb-0">© 2024 Grievance Redressal System. All rights reserved.</p>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </div>
    );
};

export default LandingPage; 