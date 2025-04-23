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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedOfficers, setAssignedOfficers] = useState([]);
  const [resourceForm, setResourceForm] = useState({
    startDate: '',
    endDate: '',
    requirementsNeeded: '',
    fundsRequired: '',
    resourcesRequired: '',
    manpowerNeeded: ''
  });
  const [timelineForm, setTimelineForm] = useState({
    startDate: '',
    endDate: '',
    milestones: [{ description: '', date: '' }]
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
    fetchAssignedOfficers();
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
            priorityExplanation: priorityData.priorityExplanation,
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

  const handleAccept = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to accept grievance');

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

  const handleTimelineSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000/api/grievances/${selectedGrievance._id}/timeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(timelineForm)
      });

      if (!response.ok) throw new Error('Failed to submit timeline');

      setShowTimelineModal(false);
      setTimelineForm({
        startDate: '',
        endDate: '',
        milestones: [{ description: '', date: '' }]
      });
      toast.success('Timeline submitted successfully');
      fetchGrievances();
    } catch (error) {
      console.error('Error submitting timeline:', error);
      toast.error('Failed to submit timeline');
    }
  };

  const addMilestone = () => {
    setTimelineForm(prev => ({
      ...prev,
      milestones: [...prev.milestones, { description: '', date: '' }]
    }));
  };

  const removeMilestone = (index) => {
    setTimelineForm(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index, field, value) => {
    setTimelineForm(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const handleAssign = async (grievanceId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignedTo })
      });

      if (!response.ok) throw new Error('Failed to assign grievance');

      setShowAssignModal(false);
      setAssignedTo('');
      toast.success('Grievance assigned successfully');
      fetchGrievances();
    } catch (error) {
      console.error('Error assigning grievance:', error);
      toast.error('Failed to assign grievance');
    }
  };

  const fetchAssignedOfficers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('http://localhost:5000/api/officers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch officers');

      const data = await response.json();
      setAssignedOfficers(data);
    } catch (error) {
      console.error('Error fetching officers:', error);
      toast.error('Failed to fetch officers');
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
                onClick={() => handleAccept(grievance._id)}
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
          <main className="main-content w-100">
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
            </div>

            <div className="grievances-container">
              {grievances[activeTab].length === 0 ? (
                <div className="no-grievances">
                  <h4>No grievances found</h4>
                </div>
              ) : (
                grievances[activeTab].map(renderGrievanceCard)
              )}
            </div>
          </main>
        </div>

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

        {showAssignModal && selectedGrievance && (
          <div className="modal">
            <div className="modal-content">
              <h3>Assign Grievance</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAssign(selectedGrievance._id);
              }}>
                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                  >
                    <option value="">Select Officer</option>
                    {assignedOfficers.map(officer => (
                      <option key={officer._id} value={officer._id}>
                        {officer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Assign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showTimelineModal && selectedGrievance && (
          <div className="modal">
            <div className="modal-content">
              <h3>Add Timeline</h3>
              <form onSubmit={handleTimelineSubmit}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={timelineForm.startDate}
                    onChange={(e) => setTimelineForm(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={timelineForm.endDate}
                    onChange={(e) => setTimelineForm(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Milestones</label>
                  {timelineForm.milestones.map((milestone, index) => (
                    <div key={index} className="milestone-group">
                      <input
                        type="text"
                        placeholder="Milestone Description"
                        value={milestone.description}
                        onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                        required
                      />
                      <input
                        type="date"
                        value={milestone.date}
                        onChange={(e) => updateMilestone(index, 'date', e.target.value)}
                        required
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeMilestone(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addMilestone}
                  >
                    Add Milestone
                  </button>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTimelineModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit Timeline
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

        {showDetails && renderDetailsModal()}
      </div>
    </div>
  );
};

export default RtoDashboard;