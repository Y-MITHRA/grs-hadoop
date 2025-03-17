import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaUser, FaSignOutAlt, FaCheck, FaPlay, FaCheckCircle } from 'react-icons/fa';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

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
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [socket, setSocket] = useState(null);

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
  }, [user, navigate, activeTab]);

  useEffect(() => {
    if (selectedGrievance) {
      fetchChatMessages(selectedGrievance._id);
    }
  }, [selectedGrievance]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && selectedGrievance) {
      // Join chat room
      socket.emit('join-chat', selectedGrievance._id);

      // Listen for new messages
      socket.on('new-message', (message) => {
        setChatMessages(prev => [...prev, message]);
      });

      return () => {
        socket.emit('leave-chat', selectedGrievance._id);
        socket.off('new-message');
      };
    }
  }, [socket, selectedGrievance]);

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

  const fetchChatMessages = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/chat`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat messages');
      }

      const data = await response.json();
      setChatMessages(data.messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
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

      // Refresh data
      fetchGrievances();
      setActiveTab('assigned');
    } catch (error) {
      console.error('Error accepting grievance:', error);
      setError('Failed to accept grievance');
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
            resolutionMessage: 'Grievance resolved with attached document'
          })
        });

        if (!resolveResponse.ok) {
          throw new Error('Failed to resolve grievance');
        }

        // Refresh the grievances list
        fetchGrievances();
        toast.success('Grievance resolved successfully');
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
    } catch (error) {
      console.error('Error sending chat message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredGrievances = grievances[activeTab].filter(grievance =>
    grievance.grievanceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grievance.title.toLowerCase().includes(searchQuery.toLowerCase())
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
                Pending Acceptance
              </div>
              <div
                className={`tab ${activeTab === "assigned" ? "active" : ""}`}
                onClick={() => setActiveTab("assigned")}
              >
                Assigned Cases
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
                  <div
                    className={`grievance-item ${selectedGrievance?._id === item._id ? 'selected' : ''}`}
                    key={item._id}
                    onClick={() => setSelectedGrievance(item)}
                  >
                    <div className="grievance-header">
                      <div className="grievance-id">{item.grievanceId}</div>
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
                      <div className="grievance-actions">
                        {activeTab === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccept(item);
                              }}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-danger btn-sm ms-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGrievance(item);
                                setShowDeclineModal(true);
                              }}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {activeTab === 'assigned' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartProgress(item._id);
                            }}
                          >
                            Start
                          </button>
                        )}
                        {activeTab === 'inProgress' && (
                          <>
                            <button
                              className="btn btn-info btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGrievance(item);
                              }}
                            >
                              Chat
                            </button>
                            <button
                              className="btn btn-success btn-sm ms-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(item._id);
                              }}
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {grievances[activeTab].length === 0 && (
                  <div className="text-center p-4">No grievances found</div>
                )}
              </div>
            )}
          </main>

          {selectedGrievance && (
            <aside className="detail-panel">
              <div className="detail-header">
                <h3>Grievance Details</h3>
                <button
                  className="close-btn"
                  onClick={() => setSelectedGrievance(null)}
                >
                  ×
                </button>
              </div>
              <div className="detail-content">
                <div className="grievance-info">
                  <p><strong>ID:</strong> {selectedGrievance.grievanceId}</p>
                  <p><strong>Title:</strong> {selectedGrievance.title}</p>
                  <p><strong>Description:</strong> {selectedGrievance.description}</p>
                  <p><strong>Status:</strong> {selectedGrievance.status}</p>
                  <p><strong>Submitted by:</strong> {selectedGrievance.petitioner?.name}</p>
                  {selectedGrievance.assignedTo && (
                    <p><strong>Assigned to:</strong> {selectedGrievance.assignedTo.name}</p>
                  )}
                </div>

                {(activeTab === 'assigned' || activeTab === 'myQueries') && (
                  <div className="chat-section">
                    <div className="chat-messages">
                      {chatMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`chat-message ${msg.senderType === 'Official' ? 'sent' : 'received'}`}
                        >
                          <div className="message-content">
                            <p>{msg.message}</p>
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="chat-input">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      />
                      <button onClick={sendChatMessage}>Send</button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
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

      {selectedGrievance && selectedGrievance.status === 'resolved' && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Resolution Details</h3>
          {selectedGrievance.resolutionDocument && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Resolution Document:</p>
              <a
                href={`http://localhost:5000/uploads/resolution-docs/${selectedGrievance.resolutionDocument.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View Document
              </a>
            </div>
          )}
          {selectedGrievance.resolution && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Resolution Message:</p>
              <p className="text-sm">{selectedGrievance.resolution.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WaterDashboard;