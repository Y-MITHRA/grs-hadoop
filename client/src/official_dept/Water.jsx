import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import { useAuth } from "../context/AuthContext";

const WaterDashboard = () => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [grievances, setGrievances] = useState({
    unassigned: [],
    assigned: [],
    closed: [],
    myQueries: []
  });
  const [stats, setStats] = useState({
    unassigned: 0,
    assigned: 0,
    closed: 0,
    myQueries: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId") || "N/A");
    setEmail(localStorage.getItem("email") || "N/A");
    fetchGrievances();
  }, [activeTab]);

  useEffect(() => {
    if (selectedGrievance) {
      fetchChatMessages(selectedGrievance.petitionId);
    }
  }, [selectedGrievance]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:5000/api/grievances/department/water/${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
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

  const fetchChatMessages = async (petitionId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/grievances/${petitionId}/chat`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
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

  const handleAccept = async (grievance) => {
    try {
      const response = await fetch(`http://localhost:5000/api/grievances/${grievance.petitionId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to accept grievance');
      }

      fetchGrievances();
      setSelectedGrievance(null);
    } catch (error) {
      console.error('Error accepting grievance:', error);
      setError('Failed to accept grievance. Please try again.');
    }
  };

  const handleDecline = async (grievance) => {
    try {
      const response = await fetch(`http://localhost:5000/api/grievances/${grievance.petitionId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
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
      const response = await fetch(`http://localhost:5000/api/grievances/${selectedGrievance.petitionId}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: chatMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setChatMessage("");
      fetchChatMessages(selectedGrievance.petitionId);
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeId");
    localStorage.removeItem("email");
    window.location.href = "/";
  };

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
                  <span>Unassigned:</span>
                  <span className="stat-number">{stats.unassigned}</span>
                </div>
                <div className="stat-item">
                  <span>Assigned:</span>
                  <span className="stat-number">{stats.assigned}</span>
                </div>
                <div className="stat-item">
                  <span>Closed:</span>
                  <span className="stat-number">{stats.closed}</span>
                </div>
                <div className="stat-item">
                  <span>My Queries:</span>
                  <span className="stat-number">{stats.myQueries}</span>
                </div>
              </div>
            </div>

            <div className="tabs">
              <div
                className={`tab ${activeTab === "unassigned" ? "active" : ""}`}
                onClick={() => setActiveTab("unassigned")}
              >
                Unassigned
              </div>
              <div
                className={`tab ${activeTab === "assigned" ? "active" : ""}`}
                onClick={() => setActiveTab("assigned")}
              >
                Assigned
              </div>
              <div
                className={`tab ${activeTab === "closed" ? "active" : ""}`}
                onClick={() => setActiveTab("closed")}
              >
                Closed
              </div>
              <div
                className={`tab ${activeTab === "myQueries" ? "active" : ""}`}
                onClick={() => setActiveTab("myQueries")}
              >
                My Queries
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
                    className={`grievance-item ${selectedGrievance?.petitionId === item.petitionId ? 'selected' : ''}`}
                    key={item.petitionId || item._id}
                    onClick={() => setSelectedGrievance(item)}
                  >
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
                      {activeTab === 'unassigned' && (
                        <div className="grievance-actions">
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
                        </div>
                      )}
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
                  <p><strong>ID:</strong> {selectedGrievance.petitionId}</p>
                  <p><strong>Title:</strong> {selectedGrievance.title}</p>
                  <p><strong>Description:</strong> {selectedGrievance.description}</p>
                  <p><strong>Status:</strong> {selectedGrievance.status}</p>
                  <p><strong>Submitted by:</strong> {selectedGrievance.petitioner.name}</p>
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
                          className={`chat-message ${msg.sender.role === 'official' ? 'sent' : 'received'}`}
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
    </div>
  );
};

export default WaterDashboard;