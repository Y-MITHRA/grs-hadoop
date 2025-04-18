import React, { useState, useEffect } from 'react';
import { Badge, Modal } from 'react-bootstrap';
import { findSimilarGrievances, calculateTextSimilarity } from '../utils/semanticSimilarity';

const RepeatedCaseIndicator = ({ currentGrievance, previousGrievances }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [repeatedCases, setRepeatedCases] = useState([]);

  useEffect(() => {
    if (currentGrievance && previousGrievances && previousGrievances.length > 0) {
      try {
        const otherGrievances = previousGrievances.filter(g => g._id !== currentGrievance._id);
        const similarCases = otherGrievances.map(grievance => {
          const similarity = calculateTextSimilarity(
            currentGrievance.description || '',
            grievance.description || '',
            otherGrievances.map(g => g.description || '')
          );
          return {
            ...grievance,
            similarity: similarity || 0
          };
        })
        .filter(grievance => grievance.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity);

        setRepeatedCases(similarCases);
      } catch (error) {
        console.error('Error calculating similarities:', error);
        setRepeatedCases([]);
      }
    } else {
      setRepeatedCases([]);
    }
  }, [currentGrievance, previousGrievances]);

  const handleBadgeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const handleGrievanceClick = (grievance) => {
    setSelectedGrievance(grievance);
    setShowDetailsModal(true);
    setShowModal(false); // Hide the list modal when showing details
  };

  const handleBackClick = () => {
    setShowDetailsModal(false);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (repeatedCases.length === 0) {
    return null;
  }

  return (
    <>
      <Badge 
        bg="warning" 
        text="dark" 
        style={{ 
          cursor: 'pointer',
          marginLeft: '8px',
          padding: '6px 10px',
          fontSize: '0.85em'
        }}
        onClick={handleBadgeClick}
      >
        Similar Cases ({repeatedCases.length})
      </Badge>

      {/* List Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        size="lg"
        centered
        style={{ zIndex: 1050 }}
      >
        <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
          <Modal.Title style={{ fontSize: '1.2rem' }}>Similar Grievances Found</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
          {repeatedCases.map((grievance) => (
            <div
              key={grievance._id}
              onClick={() => handleGrievanceClick(grievance)}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #dee2e6',
                cursor: 'pointer',
                backgroundColor: '#fff',
                transition: 'background-color 0.15s ease-in-out'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: '500' }}>ID: {grievance.petitionId}</span>
                  <span style={{
                    backgroundColor: '#17a2b8',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    marginLeft: '8px'
                  }}>
                    {Math.round(grievance.similarity * 100)}% Similar
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.9em', color: '#495057' }}>
                {grievance.description?.substring(0, 150)}...
              </div>
            </div>
          ))}
        </Modal.Body>
      </Modal>

      {/* Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        centered
        style={{ zIndex: 1060 }}
      >
        <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
          <div 
            onClick={handleBackClick}
            style={{ 
              cursor: 'pointer',
              marginRight: '15px',
              fontSize: '1.2rem',
              color: '#666'
            }}
          >
            ←
          </div>
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            Grievance Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px' }}>
          {selectedGrievance && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: '500', marginBottom: '5px' }}>ID</div>
                <div>{selectedGrievance.petitionId}</div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: '500', marginBottom: '5px' }}>Status</div>
                <Badge bg={selectedGrievance.status === 'pending' ? 'warning' : 'success'}>
                  {selectedGrievance.status}
                </Badge>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: '500', marginBottom: '5px' }}>Created On</div>
                <div>{formatDate(selectedGrievance.createdAt)}</div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: '500', marginBottom: '5px' }}>Description</div>
                <div style={{ 
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  lineHeight: '1.5'
                }}>
                  {selectedGrievance.description || 'No description available'}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '500', marginBottom: '5px' }}>Similarity</div>
                <Badge bg="info">
                  {Math.round(selectedGrievance.similarity * 100)}% Similar to Current Case
                </Badge>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <style>
        {`
          .modal-backdrop {
            background-color: rgba(0, 0, 0, 0.3) !important;
          }
          .modal-content {
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
            border: none;
            border-radius: 0.5rem;
          }
        `}
      </style>
    </>
  );
};

export default RepeatedCaseIndicator; 