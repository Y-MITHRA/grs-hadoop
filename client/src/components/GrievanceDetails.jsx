import React, { useState, useEffect } from 'react';
import ChatComponent from './ChatComponent';
import RepeatedCaseIndicator from './RepeatedCaseIndicator';
import RepetitiveCasesView from './RepetitiveCasesView';
import { Card, Row, Col, Tabs, Tab } from 'react-bootstrap';

const GrievanceDetails = ({ grievance, previousGrievances = [] }) => {
    const [selectedGrievance, setSelectedGrievance] = useState(grievance);
    const [activeTab, setActiveTab] = useState('details');

    console.log('GrievanceDetails received grievance:', {
        id: grievance?._id,
        hasAssignedOfficials: !!grievance?.assignedOfficials,
        assignedOfficialsCount: grievance?.assignedOfficials?.length,
        petitioner: grievance?.petitioner,
        petitionerId: grievance?.petitioner?._id || grievance?.petitioner,
        fullGrievance: grievance
    });

    // Validate required data
    if (!grievance?._id) {
        console.error('Missing grievance ID');
        return <div className="text-red-500">Error: Missing grievance information</div>;
    }

    if (!grievance?.assignedOfficials?.length) {
        console.log('No officials assigned to this grievance');
        return <div className="text-yellow-500">No officials assigned to this grievance yet</div>;
    }

    // Get petitioner ID, handling both direct ID and populated object cases
    const petitionerId = grievance?.petitioner?._id || grievance?.petitioner;
    
    if (!petitionerId) {
        console.error('Missing petitioner ID:', grievance?.petitioner);
        return <div className="text-red-500">Error: Missing petitioner information</div>;
    }

    const handleGrievanceClick = (grievance) => {
        setSelectedGrievance(grievance);
    };

    return (
        <div className="grievance-details">
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
            >
                <Tab eventKey="details" title="Details">
                    <Card className="mb-4">
                        <Card.Header>
                            <Row className="align-items-center">
                                <Col>
                                    <h3>Grievance Details</h3>
                                </Col>
                                <Col xs="auto">
                                    <RepeatedCaseIndicator
                                        currentGrievance={selectedGrievance}
                                        previousGrievances={previousGrievances}
                                        onGrievanceClick={handleGrievanceClick}
                                    />
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <p><strong>ID:</strong> {selectedGrievance._id}</p>
                                    <p><strong>Division:</strong> {selectedGrievance.division}</p>
                                    <p><strong>District:</strong> {selectedGrievance.district}</p>
                                    <p><strong>Taluk:</strong> {selectedGrievance.taluk}</p>
                                </Col>
                                <Col md={6}>
                                    <p><strong>Status:</strong> {selectedGrievance.status}</p>
                                    <p><strong>Created:</strong> {new Date(selectedGrievance.createdAt).toLocaleDateString()}</p>
                                    <p><strong>Last Updated:</strong> {new Date(selectedGrievance.updatedAt).toLocaleDateString()}</p>
                                </Col>
                            </Row>
                            <Row className="mt-3">
                                <Col>
                                    <h5>Description</h5>
                                    <p>{selectedGrievance.description}</p>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>
                
                <Tab eventKey="repetitive" title="Repetitive Cases">
                    <RepetitiveCasesView grievanceId={selectedGrievance._id} />
                </Tab>
                
                <Tab eventKey="chat" title="Chat">
                    <div className="chat-section mt-4">
                        <h3>Chat with Official</h3>
                        <ChatComponent
                            grievanceId={selectedGrievance._id}
                            petitionerId={petitionerId}
                            officialId={selectedGrievance.assignedOfficials[0]}
                        />
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
};

export default GrievanceDetails; 