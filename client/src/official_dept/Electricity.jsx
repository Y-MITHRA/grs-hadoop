import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import { useAuth } from "../context/AuthContext";

const ElectricityDashboard = () => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
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

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId") || "N/A");
    setEmail(localStorage.getItem("email") || "N/A");
    fetchGrievances();
  }, [activeTab]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:5000/api/grievances/department/electricity/${activeTab}`, {
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

      // Update stats if stats are included in the response
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
            <h2>Electricity Department</h2>
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
              <span className="icon">⚡</span>
              <span>Connection Status</span>
            </div>
            <div className="menu-item">
              <span className="icon">💡</span>
              <span>Load Management</span>
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
                  <div className="grievance-item" key={item.petitionId || item._id}>
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
    </div>
  );
};

export default ElectricityDashboard;