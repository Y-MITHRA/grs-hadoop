import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import { useAuth } from "../context/AuthContext";
import { toast } from 'react-hot-toast';
import ChatComponent from '../components/ChatComponent';

const RtoDashboard = () => {
  const { user } = useAuth();
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
  const [chatMessage, setChatMessage] = useState("");
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
    setEmployeeId(localStorage.getItem("employeeId") || "N/A");
    setEmail(localStorage.getItem("email") || "N/A");
    fetchGrievances();
  }, [activeTab]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/department/RTO/${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch grievances');
      }

      const data = await response.json();

      setGrievances(prev => ({
        ...prev,
        [activeTab]: data.grievances
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

  const handleAccept = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to accept grievance');
      }

      // Refresh data and switch to assigned tab
      fetchGrievances();
      setActiveTab('assigned');
      toast.success('Grievance accepted successfully');
    } catch (error) {
      console.error('Error accepting grievance:', error);
      toast.error(error.message || 'Failed to accept grievance');
    }
  };

  const handleDecline = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/decline`, {
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
      toast.success('Grievance declined successfully');
      fetchGrievances();
    } catch (error) {
      console.error('Error declining grievance:', error);
      toast.error(error.message || 'Failed to decline grievance');
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

      // Refresh data and switch to inProgress tab
      fetchGrievances();
      setActiveTab('inProgress');
      toast.success('Started working on grievance');
    } catch (error) {
      console.error('Error starting progress:', error);
      toast.error(error.message || 'Failed to start progress');
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

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload resolution document');
        }

        // Then resolve the grievance
        const resolveResponse = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/resolve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            resolution: 'Grievance resolved with attached document'
          })
        });

        if (!resolveResponse.ok) {
          throw new Error('Failed to resolve grievance');
        }

        // Refresh data and switch to resolved tab
        fetchGrievances();
        setActiveTab('resolved');
        toast.success('Grievance resolved successfully');
      };

      fileInput.click();
    } catch (error) {
      console.error('Error resolving grievance:', error);
      toast.error(error.message || 'Failed to resolve grievance');
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !selectedGrievance) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${selectedGrievance._id}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: chatMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setChatMessage("");
      fetchGrievances();
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeId");
    localStorage.removeItem("email");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleViewChat = (grievance) => {
    setSelectedGrievance(grievance);
    setShowChat(true);
  };

  return (
    <div>
      <NavBar_Departments />
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo-section">
            <h2>RTO Department</h2>
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
              <span className="icon">🚗</span>
              <span>Vehicle Services</span>
            </div>
            <div className="menu-item">
              <span className="icon">📄</span>
              <span>License Services</span>
            </div>
            <div className="menu-item">
              <span className="icon">📊</span>
              <span>Reports</span>
            </div>
            <div className="menu-item">
              <span className="icon">⚙️</span>
              <span>Settings</span>
            </div>
            <div className="menu-item" onClick={handleLogout}>
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

            <div className="tabs">
              <div
                className={`tab ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending
              </div>
              <div
                className={`tab ${activeTab === "assigned" ? "active" : ""}`}
                onClick={() => setActiveTab("assigned")}
              >
                Assigned
              </div>
              <div
                className={`tab ${activeTab === "inProgress" ? "active" : ""}`}
                onClick={() => setActiveTab("inProgress")}
              >
                In Progress
              </div>
              <div
                className={`tab ${activeTab === "resolved" ? "active" : ""}`}
                onClick={() => setActiveTab("resolved")}
              >
                Resolved
              </div>
            </div>

            <div className="search-filter">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="filter-btn">
                <span>Filter</span>
                <span className="filter-icon">🔽</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center p-4">Loading...</div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : (
              <div className="grievance-list">
                {grievances[activeTab].map((item) => (
                  <div className="grievance-item" key={item._id}>
                    <div className="grievance-header">
                      <div className="grievance-id">{item.petitionId}</div>
                      <div className="grievance-title">{item.title}</div>
                      <div className="grievance-assignee">
                        {item.assignedTo && (
                          <>
                            <img src="/api/placeholder/24/24" alt="Assignee" className="assignee-avatar" />
                            <span>{item.assignedTo.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grievance-details">
                      <div className="grievance-date">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div className="grievance-status">
                        <span className={`status ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="grievance-actions">
                      {activeTab === "pending" && (
                        <>
                          <button
                            className="btn btn-success"
                            onClick={() => handleAccept(item._id)}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              setSelectedGrievance(item);
                              setShowDeclineModal(true);
                            }}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {activeTab === "assigned" && (
                        <>
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setSelectedGrievance(item);
                              setShowResourceModal(true);
                            }}
                          >
                            Resource Management
                          </button>
                        </>
                      )}
                      {activeTab === "inProgress" && (
                        <>
                          <button
                            className="btn btn-info"
                            onClick={() => {
                              setSelectedGrievance(item);
                              setShowTimelineModal(true);
                            }}
                          >
                            Update Timeline
                          </button>
                          <button
                            className="btn btn-success"
                            onClick={() => handleResolve(item._id)}
                          >
                            Mark as Resolved
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedGrievance(item);
                          setShowChat(true);
                        }}
                      >
                        Chat
                      </button>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => {
                          setSelectedGrievance(item);
                          setShowDetails(true);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
                {grievances[activeTab].length === 0 && (
                  <div className="text-center p-4">No grievances found</div>
                )}
              </div>
            )}
          </main>
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
                onClick={() => handleDecline(selectedGrievance._id)}
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
          <div className="modal-content resource-modal">
            <div className="modal-header">
              <h2>Resource Management</h2>
              <button className="btn-close" onClick={() => setShowResourceModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleResourceSubmit(selectedGrievance._id);
            }}>
              <div className="modal-body">
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
                    placeholder="List all requirements for this grievance"
                  />
                  <div className="resource-hint">Specify all materials, equipment, and other requirements</div>
                </div>
                <div className="form-group">
                  <label>Funds Required (₹)</label>
                  <input
                    type="number"
                    value={resourceForm.fundsRequired}
                    onChange={(e) => setResourceForm(prev => ({ ...prev, fundsRequired: e.target.value }))}
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <div className="form-group">
                  <label>Resources Required</label>
                  <textarea
                    value={resourceForm.resourcesRequired}
                    onChange={(e) => setResourceForm(prev => ({ ...prev, resourcesRequired: e.target.value }))}
                    required
                    placeholder="List all resources needed"
                  />
                </div>
                <div className="form-group">
                  <label>Manpower Needed</label>
                  <input
                    type="number"
                    value={resourceForm.manpowerNeeded}
                    onChange={(e) => setResourceForm(prev => ({ ...prev, manpowerNeeded: e.target.value }))}
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="modal-footer">
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
          <div className="modal-content timeline-modal">
            <div className="modal-header">
              <h2>Update Timeline</h2>
              <button className="btn-close" onClick={() => setShowTimelineModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleTimelineSubmit(selectedGrievance._id);
            }}>
              <div className="modal-body">
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
                    placeholder="Describe the current stage progress"
                  />
                  <div className="timeline-description">
                    Example: "Conducted site inspection and collected evidence"
                  </div>
                </div>
              </div>
              <div className="modal-footer">
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

      {showDetails && selectedGrievance && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Grievance Details</h3>
              <button onClick={() => setShowDetails(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>ID:</strong> {selectedGrievance._id}</p>
              <p><strong>Title:</strong> {selectedGrievance.title}</p>
              <p><strong>Description:</strong> {selectedGrievance.description}</p>
              <p><strong>Status:</strong> {selectedGrievance.status}</p>
              <p><strong>Priority:</strong> {selectedGrievance.priority}</p>
              <p><strong>Created At:</strong> {new Date(selectedGrievance.createdAt).toLocaleString()}</p>
              <p><strong>Location:</strong> {selectedGrievance.location}</p>
              {selectedGrievance.assignedTo && (
                <p><strong>Assigned To:</strong> {selectedGrievance.assignedTo.firstName} {selectedGrievance.assignedTo.lastName}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RtoDashboard;