import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import { useAuth } from "../context/AuthContext";
import { FaSearch, FaUser, FaSignOutAlt, FaCheck, FaPlay, FaCheckCircle, FaClock, FaClipboardList, FaComments, FaTimes, FaEye, FaTools } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ChatComponent from '../components/ChatComponent';
import "../styles/Chat.css";
import NotificationBell from '../components/NotificationBell';
import { Dropdown } from 'react-bootstrap';
import RepeatedCaseIndicator from '../components/RepeatedCaseIndicator';

const RtoDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
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

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-badge pending';
      case 'assigned':
        return 'status-badge assigned';
      case 'in-progress':
        return 'status-badge in-progress';
      case 'resolved':
        return 'status-badge resolved';
      default:
        return 'status-badge';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'priority-badge priority-high';
      case 'medium':
        return 'priority-badge priority-medium';
      case 'low':
        return 'priority-badge priority-low';
      default:
        return 'priority-badge';
    }
  };

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
  }, [user, activeTab, priorityFilter]);

  const analyzePriorityLocally = (grievance) => {
    const description = grievance.description?.toLowerCase() || '';
    const title = grievance.title?.toLowerCase() || '';

    // Keywords indicating high priority for RTO department
    const highPriorityKeywords = [
      'urgent', 'emergency', 'immediate', 'critical', 'severe', 'dangerous',
      'accident', 'death', 'injury', 'fatal', 'collision', 'drunk driving',
      'hit and run', 'illegal', 'safety hazard', 'dangerous driving',
      'road rage', 'traffic violation', 'speeding', 'reckless'
    ];

    // Keywords indicating medium priority
    const mediumPriorityKeywords = [
      'important', 'moderate', 'repair', 'fix', 'maintenance',
      'license renewal', 'registration renewal', 'permit',
      'vehicle fitness', 'tax payment', 'route deviation',
      'parking violation', 'traffic congestion', 'road work'
    ];

    // Check for high priority keywords
    const hasHighPriority = highPriorityKeywords.some(keyword =>
      description.includes(keyword) || title.includes(keyword)
    );

    // Check for medium priority keywords
    const hasMediumPriority = mediumPriorityKeywords.some(keyword =>
      description.includes(keyword) || title.includes(keyword)
    );

    if (hasHighPriority) {
      return {
        priority: 'High',
        explanation: 'This grievance requires immediate attention due to potential safety hazards or critical traffic issues.',
        impactAssessment: 'High impact on public safety and transportation services. Immediate action required.',
        recommendedResponseTime: '24-48 hours'
      };
    } else if (hasMediumPriority) {
      return {
        priority: 'Medium',
        explanation: 'This grievance needs attention but is not critical.',
        impactAssessment: 'Moderate impact on transportation services. Action required within standard timeframe.',
        recommendedResponseTime: '3-5 working days'
      };
    } else {
      return {
        priority: 'Low',
        explanation: 'This is a routine grievance that can be handled through standard procedures.',
        impactAssessment: 'Limited impact on transportation services. Can be addressed through regular processing.',
        recommendedResponseTime: '7-10 working days'
      };
    }
  };

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `http://localhost:5000/api/grievances/department/RTO/${activeTab}${priorityFilter ? `?priority=${priorityFilter}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch grievances');
      }

      const data = await response.json();

      // Process grievances with priority analysis
      const processedGrievances = await Promise.all(data.grievances.map(async (grievance) => {
        try {
          // Call Gemini AI for priority analysis
          const priorityResponse = await fetch('http://localhost:5000/api/grievances/analyze-priority', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: grievance.title || '',
              description: grievance.description || '',
              department: 'RTO'
            })
          });

          if (!priorityResponse.ok) {
            throw new Error('Failed to analyze priority');
          }

          const priorityData = await priorityResponse.json();

          return {
            ...grievance,
            grievanceId: grievance.petitionId || grievance.grievanceId || 'N/A',
            title: grievance.title || 'No Title',
            description: grievance.description || 'No Description',
            createdAt: grievance.createdAt || new Date().toISOString(),
            priority: priorityData.priority,
            priorityExplanation: priorityData.explanation,
            impactAssessment: priorityData.impactAssessment,
            recommendedResponseTime: priorityData.recommendedResponseTime,
            originalDocument: grievance.originalDocument || null,
            attachments: grievance.attachments || []
          };
        } catch (error) {
          console.error('Error analyzing priority:', error);
          // Fallback to local analysis if API fails
          const localPriorityData = analyzePriorityLocally(grievance);
          return {
            ...grievance,
            grievanceId: grievance.petitionId || grievance.grievanceId || 'N/A',
            title: grievance.title || 'No Title',
            description: grievance.description || 'No Description',
            createdAt: grievance.createdAt || new Date().toISOString(),
            priority: localPriorityData.priority,
            priorityExplanation: localPriorityData.explanation,
            impactAssessment: localPriorityData.impactAssessment,
            recommendedResponseTime: localPriorityData.recommendedResponseTime,
            originalDocument: grievance.originalDocument || null,
            attachments: grievance.attachments || []
          };
        }
      }));

      // Apply client-side filtering as a fallback
      const filteredGrievances = processedGrievances.filter(grievance => {
        if (!priorityFilter) return true;
        return grievance.priority?.toLowerCase() === priorityFilter.toLowerCase();
      });

      setGrievances(prev => ({
        ...prev,
        [activeTab]: filteredGrievances
      }));

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching grievances:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptGrievance = async (grievanceId) => {
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

      toast.success('Grievance accepted successfully');
      fetchGrievances();
    } catch (error) {
      console.error('Error accepting grievance:', error);
      toast.error('Failed to accept grievance');
    }
  };

  const handleDeclineGrievance = async (grievanceId) => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

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

      toast.success('Grievance declined successfully');
      setShowDeclineModal(false);
      setDeclineReason('');
      fetchGrievances();
    } catch (error) {
      console.error('Error declining grievance:', error);
      toast.error('Failed to decline grievance');
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
        body: JSON.stringify({ comment: 'Started working on the grievance' })
      });

      if (!response.ok) {
        throw new Error('Failed to start progress');
      }

      toast.success('Progress started successfully');
      fetchGrievances();
    } catch (error) {
      console.error('Error starting progress:', error);
      toast.error('Failed to start progress');
    }
  };

  const handleResolveGrievance = async (grievanceId) => {
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

  const handleViewChat = (grievance) => {
    setSelectedGrievance(grievance);
    setShowChat(true);
  };

  const handleResourceSubmit = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/resource-management`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resourceForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update resource management');
      }

      toast.success('Resource management updated successfully');
      setShowResourceModal(false);
      setResourceForm({
        startDate: '',
        endDate: '',
        requirementsNeeded: '',
        fundsRequired: '',
        resourcesRequired: '',
        manpowerNeeded: ''
      });
      fetchGrievances();
    } catch (error) {
      console.error('Error updating resource management:', error);
      toast.error('Failed to update resource management');
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

  const renderDetailsModal = () => {
    if (!selectedGrievance) return null;
    return (
      <div className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Grievance Details</h2>
              <p className="text-sm text-gray-500 mt-1">ID: {selectedGrievance.grievanceId}</p>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="modal-body space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Priority Analysis</h3>
                <span className={getPriorityBadgeClass(selectedGrievance.priority)}>
                  {selectedGrievance.priority || 'Not set'}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {selectedGrievance.priorityExplanation || 'Priority explanation not available'}
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Impact Assessment</h3>
              <p className="text-gray-700 leading-relaxed">
                {selectedGrievance.impactAssessment || 'Impact assessment not available'}
              </p>
            </div>

            {/* Document Viewing Section */}
            {(selectedGrievance.originalDocument || (selectedGrievance.attachments && selectedGrievance.attachments.length > 0)) && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submitted Documents</h3>

                {selectedGrievance.originalDocument && (
                  <div className="mb-3">
                    <h5 className="font-medium">Original Document:</h5>
                    <a
                      href={`http://localhost:5000/uploads/documents/${selectedGrievance.originalDocument.path.split('/').pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-2"
                    >
                      <FaEye className="mr-2" /> View Document
                    </a>
                  </div>
                )}

                {selectedGrievance.attachments && selectedGrievance.attachments.length > 0 && (
                  <div>
                    <h5 className="font-medium">Additional Attachments:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {selectedGrievance.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={`http://localhost:5000/uploads/documents/${attachment.path.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <FaEye className="mr-2" /> Attachment {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Response Time</h3>
              <p className="text-gray-700 leading-relaxed">
                {selectedGrievance.recommendedResponseTime || 'Standard response time'}
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
              <p className="text-gray-700 leading-relaxed">
                {selectedGrievance.location || 'Location details not available'}
              </p>
            </div>

            {selectedGrievance.assignedTo && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Personnel</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaUser className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedGrievance.assignedTo.firstName} {selectedGrievance.assignedTo.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedGrievance.assignedTo.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              onClick={() => setShowDetails(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGrievanceCard = (grievance) => {
    return (
      <div key={grievance._id} className="grievance-card">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">{grievance.title}</h3>
              <span className={getPriorityBadgeClass(grievance.priority)}>
                {grievance.priority || 'Not set'}
              </span>
              <RepeatedCaseIndicator
                currentGrievance={grievance}
                previousGrievances={grievances[activeTab]}
                onGrievanceClick={(g) => setSelectedGrievance(g)}
              />
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2">
                <span className="font-medium">ID:</span> {grievance.grievanceId}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium">Created:</span> {new Date(grievance.createdAt).toLocaleDateString()}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <span className={getStatusBadgeClass(grievance.status)}>{grievance.status}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedGrievance(grievance);
                setShowDetails(true);
              }}
              className="btn btn-primary"
            >
              <FaEye className="mr-2" /> View Details
            </button>
            {(activeTab === 'assigned' || activeTab === 'inProgress') && !grievance.isResolved && (
              <button
                onClick={() => handleViewChat(grievance)}
                className="btn btn-secondary"
              >
                <FaComments className="mr-2" /> Chat
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-700 mb-4 line-clamp-2">{grievance.description}</p>
        <div className="flex justify-end gap-2">
          {activeTab === 'pending' && (
            <>
              <button
                onClick={() => handleAcceptGrievance(grievance._id)}
                className="btn btn-success"
              >
                <FaCheck className="mr-2" /> Accept
              </button>
              <button
                onClick={() => {
                  setSelectedGrievance(grievance);
                  setShowDeclineModal(true);
                }}
                className="btn btn-danger"
              >
                <FaTimes className="mr-2" /> Decline
              </button>
            </>
          )}
          {activeTab === 'assigned' && (
            <button
              onClick={() => {
                setSelectedGrievance(grievance);
                setShowResourceModal(true);
              }}
              className="btn btn-primary"
            >
              <FaTools className="mr-2" /> Resource Management
            </button>
          )}
          {activeTab === 'inProgress' && (
            <>
              <button
                onClick={() => {
                  setSelectedGrievance(grievance);
                  setShowTimelineModal(true);
                }}
                className="btn btn-primary"
              >
                <FaClock className="mr-2" /> Update Timeline
              </button>
              <button
                onClick={() => handleResolveGrievance(grievance._id)}
                className="btn btn-success"
              >
                <FaCheckCircle className="mr-2" /> Mark as Resolved
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="department-header bg-primary text-white p-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h2 className="mb-0">RTO Department</h2>
          <span className="badge bg-info ms-2">
            Jurisdiction: {user?.taluk || 'N/A'}, {user?.district || 'N/A'}, {user?.division || 'N/A'}
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          {/* Notification Bell */}
          {user && (
            <div className="position-relative">
              <NotificationBell
                userId={user.id}
                userRole={user.role}
              />
            </div>
          )}

          {/* User Profile */}
          <Dropdown>
            <Dropdown.Toggle variant="light" className="d-flex align-items-center">
              <FaUser className="me-2" />
              {email}
              <span className="badge bg-secondary ms-2">RTO</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => navigate('/settings')}>
                <FaTools className="me-2" />
                Settings
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => {
                logout();
                navigate('/login');
              }} className="text-danger">
                <FaSignOutAlt className="me-2" />
                Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content p-4">
        {/* Stats Section */}
        <div className="stats-container mb-4">
          <div className="row">
            <div className="col-md-3">
              <div className="stat-card" onClick={() => setActiveTab("pending")}>
                <div className={`card ${activeTab === "pending" ? 'border-primary' : ''}`}>
                  <div className="card-body">
                    <h5 className="card-title">Pending</h5>
                    <h2 className="card-text">{stats.pending}</h2>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card" onClick={() => setActiveTab("assigned")}>
                <div className={`card ${activeTab === "assigned" ? 'border-primary' : ''}`}>
                  <div className="card-body">
                    <h5 className="card-title">Assigned</h5>
                    <h2 className="card-text">{stats.assigned}</h2>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card" onClick={() => setActiveTab("inProgress")}>
                <div className={`card ${activeTab === "inProgress" ? 'border-primary' : ''}`}>
                  <div className="card-body">
                    <h5 className="card-title">In Progress</h5>
                    <h2 className="card-text">{stats.inProgress}</h2>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card" onClick={() => setActiveTab("resolved")}>
                <div className={`card ${activeTab === "resolved" ? 'border-primary' : ''}`}>
                  <div className="card-body">
                    <h5 className="card-title">Resolved</h5>
                    <h2 className="card-text">{stats.resolved}</h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container mb-4">
          <div className="row">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search grievances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>
        </div>

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

              <div className="grievances-list">
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : error ? (
                  <div className="error">{error}</div>
                ) : grievances[activeTab].length === 0 ? (
                  <div className="no-grievances">
                    <h4>No grievances found in your jurisdiction</h4>
                    <p className="text-muted">
                      Grievances are assigned based on your jurisdiction (Taluk: {user?.taluk || 'Not set'},
                      District: {user?.district || 'Not set'}, Division: {user?.division || 'Not set'}).
                    </p>
                    <p className="text-muted">
                      While there may be pending grievances in the RTO department,
                      none match your specific jurisdiction at this time.
                    </p>
                  </div>
                ) : (
                  grievances[activeTab].map((grievance) => renderGrievanceCard(grievance))
                )}
              </div>
            </div>
          </main>

          {showDetails && renderDetailsModal()}
        </div>
      </div>

      {/* Modals */}
      {showDeclineModal && selectedGrievance && (
        <div className="modal">
          <div className="modal-content">
            <h3>Decline Grievance</h3>
            <p>Please provide a reason for declining this grievance:</p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="form-control mb-3"
              rows="4"
              placeholder="Enter reason for declining..."
            />
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeclineGrievance(selectedGrievance._id)}
                className="btn btn-danger"
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

      {/* Chat Modal */}
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
                />
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

export default RtoDashboard;