import React, { useState, useEffect } from 'react';
import { Card, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const RepetitiveCasesView = ({ grievanceId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchRepetitiveCases = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/grievances/${grievanceId}/repetitive-cases`);
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching repetitive cases:', err);
        setError('Failed to fetch repetitive cases. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (grievanceId) {
      fetchRepetitiveCases();
    }
  }, [grievanceId]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Checking for repetitive cases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Repetitive Cases Analysis</h5>
        {data.hasRepetitiveCases && (
          <Badge bg="warning" text="dark">Repetitive Case Detected</Badge>
        )}
      </Card.Header>
      <Card.Body>
        {data.hasRepetitiveCases ? (
          <>
            <Alert variant="info">
              This grievance appears to be similar to {data.repetitiveCases.length} other grievance(s) in the same location.
            </Alert>
            
            <h6 className="mt-4">Current Grievance:</h6>
            <Card className="mb-3">
              <Card.Body>
                <p><strong>ID:</strong> {data.currentGrievance.petitionId}</p>
                <p><strong>Title:</strong> {data.currentGrievance.title}</p>
                <p><strong>Location:</strong> {data.currentGrievance.division} &gt; {data.currentGrievance.district} &gt; {data.currentGrievance.taluk}</p>
                <p><strong>Description:</strong> {data.currentGrievance.description}</p>
              </Card.Body>
            </Card>
            
            <h6 className="mt-4">Similar Grievances:</h6>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Similarity</th>
                </tr>
              </thead>
              <tbody>
                {data.repetitiveCases.map((grievance) => (
                  <tr key={grievance._id}>
                    <td>{grievance.petitionId}</td>
                    <td>{grievance.title}</td>
                    <td>
                      <Badge bg={
                        grievance.status === 'resolved' ? 'success' :
                        grievance.status === 'in-progress' ? 'primary' :
                        grievance.status === 'assigned' ? 'info' :
                        grievance.status === 'rejected' ? 'danger' : 'secondary'
                      }>
                        {grievance.status}
                      </Badge>
                    </td>
                    <td>{new Date(grievance.createdAt).toLocaleDateString()}</td>
                    <td>{(grievance.similarity * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : (
          <Alert variant="success">
            No repetitive cases found for this grievance.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default RepetitiveCasesView; 