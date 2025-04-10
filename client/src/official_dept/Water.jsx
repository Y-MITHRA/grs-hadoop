import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import { useAuth } from "../context/AuthContext";
import { FaSearch, FaUser, FaSignOutAlt, FaCheck, FaPlay, FaCheckCircle, FaClock, FaClipboardList } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ChatComponent from '../components/ChatComponent';
import "../styles/Chat.css";

const WaterDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [grievances, setGrievances] = useState({
    pending: [],
    assigned: [],
    inProgress: [],
    resolved: []
  });
  const [stats, setStats] = useState({
    pending: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    startDate: '',
    endDate: '',
    requirementsNeeded: '',
    fundsRequired: '',
    resourcesRequired: '',
    manpowerNeeded: ''
  });
  const [timelineForm, setTimelineForm] = useState({
    stageName: '',
    date: '',
    description: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Set user info
    setEmployeeId(user.id);
    setEmail(user.email);

    // Fetch initial data
    fetchGrievances();
  }, [user, activeTab]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/department/Water/${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch grievances');
      }

      const data = await response.json();
      console.log('Fetched data:', data);

      // Process grievances to ensure all required fields are present
      const processedGrievances = data.grievances.map(grievance => ({
        ...grievance,
        grievanceId: grievance.petitionId || grievance.grievanceId || 'N/A',
        title: grievance.title || 'No Title',
        description: grievance.description || 'No Description',
        createdAt: grievance.createdAt || new Date().toISOString()
      }));

      setGrievances(prev => ({
        ...prev,
        [activeTab]: processedGrievances
      }));

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching grievances:', error);
      setError('Failed to load grievances. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (grievance) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievance._id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to accept grievance');
      }

      // Refresh data
      fetchGrievances();
      setActiveTab('assigned');
      toast.success('Grievance accepted successfully');
    } catch (error) {
      console.error('Error accepting grievance:', error);
      toast.error('Failed to accept grievance');
    }
  };

  const handleResourceSubmit = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/resource-management`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resourceForm)
      });

      if (!response.ok) throw new Error('Failed to submit resource management');

      setShowResourceModal(false);
      toast.success('Resource management details submitted successfully');
      
      // Automatically start progress after resource management submission
      await handleStartProgress(grievanceId);
      
      fetchGrievances();
    } catch (error) {
      console.error('Error submitting resource management:', error);
      toast.error('Failed to submit resource management details');
    }
  };

  const handleTimelineSubmit = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/timeline-stage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(timelineForm)
      });

      if (!response.ok) throw new Error('Failed to update timeline');

      setShowTimelineModal(false);
      toast.success('Timeline updated successfully');
      fetchGrievances();
    } catch (error) {
      console.error('Error updating timeline:', error);
      toast.error('Failed to update timeline');
    }
  };

  const handleStartProgress = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/start-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: 'Starting progress on grievance' })
      });

      if (!response.ok) {
        throw new Error('Failed to start progress');
      }

      // Refresh data
      fetchGrievances();
      setActiveTab('inProgress');
    } catch (error) {
      console.error('Error starting progress:', error);
      setError('Failed to start progress');
    }
  };

  const handleResolve = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.pdf,.jpg,.jpeg,.png';
      fileInput.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) return;

          const formData = new FormData();
          formData.append('document', file);

          // First upload the document
          const uploadResponse = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/upload-resolution`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData
          });

          const uploadData = await uploadResponse.json();
          
          if (!uploadResponse.ok) {
            throw new Error(uploadData.error || 'Failed to upload resolution document');
          }

          // Then resolve the grievance
          const resolveResponse = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/resolve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              resolutionMessage: 'Grievance resolved with attached document'
            })
          });

          const resolveData = await resolveResponse.json();

          if (!resolveResponse.ok) {
            throw new Error(resolveData.error || 'Failed to resolve grievance');
          }

          // Refresh the grievances list
          fetchGrievances();
          toast.success('Grievance resolved successfully');
        } catch (error) {
          console.error('Error in file upload:', error);
          toast.error(error.message || 'Failed to upload and resolve grievance');
        }
      };

      fileInput.click();
    } catch (error) {
      console.error('Error resolving grievance:', error);
      toast.error(error.message || 'Failed to resolve grievance');
    }
  };

  const handleDecline = async (grievance) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievance._id}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: declineReason })
      });

      if (!response.ok) {
        throw new Error('Failed to decline grievance');
      }

      setShowDeclineModal(false);
      setDeclineReason("");
      fetchGrievances();
      setSelectedGrievance(null);
    } catch (error) {
      console.error('Error declining grievance:', error);
      setError('Failed to decline grievance. Please try again.');
    }
  };

  const handleViewChat = (grievance) => {
    setSelectedGrievance(grievance);
    setShowChat(true);
  };

  const filteredGrievances = grievances[activeTab].filter(grievance =>
    (grievance?.petitionId?.toLowerCase() || grievance?.grievanceId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (grievance?.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <NavBar_Departments />
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo-section">
            <h2>Water Department</h2>
          </div>
          <div className="user-section">
            <span>{employeeId} - {email}</span>
          </div>
        </header>

        <div className="content-area">
          <aside className="sidebar">
            <div className="menu-item active">
              <span className="icon">📋</span>
              <span>Grievances</span>
            </div>
            <div className="menu-item">
              <span className="icon">📊</span>
              <span>Reports</span>
            </div>
            <div className="menu-item">
              <span className="icon">⚙️</span>
              <span>Settings</span>
            </div>
            <div className="menu-item" onClick={logout}>
              <span className="icon">🚪</span>
              <span>Logout</span>
            </div>
          </aside>

          <main className="main-content">
            <div className="page-header">
              <h1>Grievances</h1>
              <div className="stats-bar">
                <div className="stat-item">
                  <span>Pending:</span>
                  <span className="stat-number">{stats.pending}</span>
                </div>
                <div className="stat-item">
                  <span>Assigned:</span>
                  <span className="stat-number">{stats.assigned}</span>
                </div>
                <div className="stat-item">
                  <span>In Progress:</span>
                  <span className="stat-number">{stats.inProgress}</span>
                </div>
                <div className="stat-item">
                  <span>Resolved:</span>
                  <span className="stat-number">{stats.resolved}</span>
                </div>
              </div>
            </div>

            <div className="tab-container">
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveTab("pending")}
                >
                  Pending
                </button>
                <button
                  className={`tab ${activeTab === "assigned" ? "active" : ""}`}
                  onClick={() => setActiveTab("assigned")}
                >
                  Assigned
                </button>
                <button
                  className={`tab ${activeTab === "inProgress" ? "active" : ""}`}
                  onClick={() => setActiveTab("inProgress")}
                >
                  In Progress
                </button>
                <button
                  className={`tab ${activeTab === "resolved" ? "active" : ""}`}
                  onClick={() => setActiveTab("resolved")}
                >
                  Resolved
                </button>
              </div>

              <div className="search-container">
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="grievances-list">
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : error ? (
                  <div className="error">{error}</div>
                ) : grievances[activeTab].length === 0 ? (
                  <div className="no-grievances">No grievances found</div>
                ) : (
                  grievances[activeTab].map((grievance) => (
                    <div key={grievance._id} className="grievance-card">
                      <div className="grievance-header">
                        <div className="grievance-id">{grievance.petitionId || grievance.grievanceId}</div>
                        <div className="grievance-date">
                          {new Date(grievance.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="grievance-title">{grievance.title}</div>
                      <div className="grievance-actions">
                        {activeTab === "pending" && (
                          <>
                            <button
                              className="btn btn-success"
                              onClick={() => handleAccept(grievance)}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => {
                                setSelectedGrievance(grievance);
                                setShowDeclineModal(true);
                              }}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {activeTab === "assigned" && (
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setSelectedGrievance(grievance);
                              setShowResourceModal(true);
                            }}
                          >
                            Resource Management
                          </button>
                        )}
                        {activeTab === "inProgress" && (
                          <>
                            <button
                              className="btn btn-info"
                              onClick={() => {
                                setSelectedGrievance(grievance);
                                setShowTimelineModal(true);
                              }}
                            >
                              Update Timeline
                            </button>
                            <button
                              className="btn btn-success"
                              onClick={() => handleResolve(grievance._id)}
                            >
                              Mark as Resolved
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleViewChat(grievance)}
                        >
                          Chat
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedGrievance(grievance);
                            setShowDetails(true);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>

          {showDetails && selectedGrievance && (
            <div className="modal">
              <div className="modal-content details-modal">
                <div className="details-header">
                  <h2>Grievance Details</h2>
                  <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
                </div>
                <div className="details-body">
                  <div className="detail-row">
                    <span className="detail-label">ID:</span>
                    <span className="detail-value">{selectedGrievance._id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Title:</span>
                    <span className="detail-value">{selectedGrievance.title}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Description:</span>
                    <span className="detail-value">{selectedGrievance.description}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedGrievance.status}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Priority:</span>
                    <span className="detail-value">{selectedGrievance.priority}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created At:</span>
                    <span className="detail-value">
                      {new Date(selectedGrievance.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{selectedGrievance.location}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeclineModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Decline Grievance</h3>
            <textarea
              placeholder="Enter reason for declining..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDecline(selectedGrievance)}
                disabled={!declineReason.trim()}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showResourceModal && selectedGrievance && (
        <div className="modal">
          <div className="modal-content">
            <h3>Resource Management</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleResourceSubmit(selectedGrievance._id);
            }}>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={resourceForm.startDate}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={resourceForm.endDate}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Requirements Needed</label>
                <textarea
                  value={resourceForm.requirementsNeeded}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, requirementsNeeded: e.target.value }))}
                  required
                  placeholder="List all requirements"
                />
              </div>
              <div className="form-group">
                <label>Funds Required (₹)</label>
                <input
                  type="number"
                  value={resourceForm.fundsRequired}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, fundsRequired: e.target.value }))}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Resources Required</label>
                <textarea
                  value={resourceForm.resourcesRequired}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, resourcesRequired: e.target.value }))}
                  required
                  placeholder="List all resources"
                />
              </div>
              <div className="form-group">
                <label>Manpower Needed</label>
                <input
                  type="number"
                  value={resourceForm.manpowerNeeded}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, manpowerNeeded: e.target.value }))}
                  required
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResourceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTimelineModal && selectedGrievance && (
        <div className="modal">
          <div className="modal-content">
            <h3>Update Timeline</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleTimelineSubmit(selectedGrievance._id);
            }}>
              <div className="form-group">
                <label>Stage</label>
                <select
                  value={timelineForm.stageName}
                  onChange={(e) => setTimelineForm(prev => ({ ...prev, stageName: e.target.value }))}
                  required
                >
                  <option value="">Select Stage</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Investigation">Investigation</option>
                  <option value="Resolution">Resolution</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={timelineForm.date}
                  onChange={(e) => setTimelineForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={timelineForm.description}
                  onChange={(e) => setTimelineForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  placeholder="Example: Gathered evidence from site visit"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTimelineModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChat && selectedGrievance && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Chat - Grievance {selectedGrievance.grievanceId}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowChat(false);
                    setSelectedGrievance(null);
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ height: '500px', padding: 0 }}>
                <ChatComponent 
                  grievanceId={selectedGrievance._id}
                  petitionerId={selectedGrievance.petitioner?._id || selectedGrievance.petitioner}
                  officialId={user.id}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterDashboard;