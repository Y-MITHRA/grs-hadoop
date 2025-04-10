import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Clock, User, Building, FileText, AlertCircle } from 'lucide-react';
import moment from 'moment';
import TimelineView from './TimelineView';

const TrackGrievance = () => {
    const [grievanceId, setGrievanceId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [grievanceData, setGrievanceData] = useState(null);
    const [showTimeline, setShowTimeline] = useState(false);

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!grievanceId.trim()) {
            setError('Please enter a Grievance ID');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`http://localhost:5000/api/grievances/track/${grievanceId}`);
            const data = await response.json();

            if (response.ok) {
                setGrievanceData(data.grievance);
                setShowTimeline(true);
            } else {
                setError(data.error || 'Failed to find grievance');
                setGrievanceData(null);
                setShowTimeline(false);
            }
        } catch (error) {
            console.error('Error tracking grievance:', error);
            setError('Failed to track grievance. Please try again.');
            setGrievanceData(null);
            setShowTimeline(false);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
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

    return (
        <div className="container py-4">
            <Card className="shadow-sm">
                <Card.Body>
                    <h4 className="mb-4">Track Your Grievance</h4>

                    <Form onSubmit={handleTrack}>
                        <Form.Group className="mb-3">
                            <Form.Label>Enter Grievance ID</Form.Label>
                            <div className="d-flex gap-2">
                                <Form.Control
                                    type="text"
                                    placeholder="e.g., GRV123456"
                                    value={grievanceId}
                                    onChange={(e) => setGrievanceId(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                                className="me-2"
                                            />
                                            Tracking...
                                        </>
                                    ) : (
                                        'Track'
                                    )}
                                </Button>
                            </div>
                        </Form.Group>
                    </Form>

                    {error && (
                        <Alert variant="danger" className="mt-3">
                            <AlertCircle size={20} className="me-2" />
                            {error}
                        </Alert>
                    )}

                    {grievanceData && (
                        <div className="mt-4">
                            <Card className="mb-4">
                                <Card.Body>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <h5 className="mb-3">Grievance Details</h5>
                                            <div className="mb-2">
                                                <FileText size={18} className="me-2" />
                                                <strong>Title:</strong> {grievanceData.title}
                                            </div>
                                            <div className="mb-2">
                                                <Building size={18} className="me-2" />
                                                <strong>Department:</strong> {grievanceData.department}
                                            </div>
                                            <div className="mb-2">
                                                <Clock size={18} className="me-2" />
                                                <strong>Submitted:</strong> {moment(grievanceData.createdAt).format('MMM D, YYYY')}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Status:</strong>{' '}
                                                <span className={`badge ${getStatusBadgeClass(grievanceData.status)}`}>
                                                    {grievanceData.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <h5 className="mb-3">Case Information</h5>
                                            <div className="mb-2">
                                                <User size={18} className="me-2" />
                                                <strong>Assigned To:</strong>{' '}
                                                {grievanceData.assignedTo ?
                                                    `${grievanceData.assignedTo.firstName} ${grievanceData.assignedTo.lastName}` :
                                                    'Not Assigned'
                                                }
                                            </div>
                                            <div className="mb-2">
                                                <strong>Last Updated:</strong>{' '}
                                                {moment(grievanceData.updatedAt).format('MMM D, YYYY')}
                                            </div>
                                            {grievanceData.resolution && (
                                                <div className="mb-2">
                                                    <strong>Resolution:</strong>{' '}
                                                    <p className="mt-1">{grievanceData.resolution.text}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>

                            {showTimeline && (
                                <div className="mt-4">
                                    <h5 className="mb-3">Timeline</h5>
                                    <TimelineView grievanceId={grievanceData._id} />
                                </div>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default TrackGrievance; 