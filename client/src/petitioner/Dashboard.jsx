import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const { user, token } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRating, setSelectedRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');

    const fetchGrievances = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/grievances/user/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch grievances');
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.grievances)) {
                setGrievances(data.grievances);
            } else {
                throw new Error('Invalid data format received');
            }
        } catch (error) {
            console.error('Error fetching grievances:', error);
            setError('Failed to load grievances');
            toast.error('Failed to load grievances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id && token) {
            fetchGrievances();
        }
    }, [user, token]);

    const handleSubmitFeedback = async (grievanceId) => {
        try {
            if (!selectedRating) {
                toast.error('Please select a rating');
                return;
            }

            const response = await fetch(`${API_URL}/grievances/${grievanceId}/feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: selectedRating,
                    comment: feedbackComment
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            // Refresh grievances list
            fetchGrievances();
            toast.success('Feedback submitted successfully');
            setSelectedRating(0);
            setFeedbackComment('');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error(error.message || 'Failed to submit feedback');
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;
    if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">My Grievances</h1>
            <div className="grid gap-6">
                {grievances.map((grievance) => (
                    <div key={grievance._id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">{grievance.title || 'Untitled'}</h2>
                                <p className="text-sm text-gray-600">ID: {grievance.petitionId || 'N/A'}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm ${grievance.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    grievance.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                        grievance.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                                            grievance.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                }`}>
                                {(grievance.status || 'unknown').charAt(0).toUpperCase() + (grievance.status || 'unknown').slice(1)}
                            </span>
                        </div>

                        <p className="text-gray-700 mb-4">{grievance.description || 'No description provided'}</p>

                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-sm text-gray-600">Department: {grievance.department || 'N/A'}</p>
                                {grievance.assignedTo && (
                                    <p className="text-sm text-gray-600">
                                        Assigned to: {grievance.assignedTo.firstName} {grievance.assignedTo.lastName}
                                        <br />
                                        <span className="text-xs text-gray-500">
                                            {grievance.assignedTo.designation} - {grievance.assignedTo.department}
                                        </span>
                                    </p>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                                Submitted: {grievance.createdAt ? new Date(grievance.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>

                        {grievance.status === 'resolved' && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Resolution Details</h3>
                                {grievance.resolutionDocument && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600">Resolution Document:</p>
                                        <a
                                            href={`${API_URL}/uploads/resolution-docs/${grievance.resolutionDocument.filename}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            View Document
                                        </a>
                                    </div>
                                )}
                                {grievance.resolution && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600">Resolution Message:</p>
                                        <p className="text-sm">{grievance.resolution.text}</p>
                                    </div>
                                )}
                                {!grievance.feedback && (
                                    <div className="mt-4">
                                        <h4 className="text-md font-semibold mb-2">Provide Feedback</h4>
                                        <div className="flex items-center space-x-2 mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setSelectedRating(star)}
                                                    className={`text-2xl ${star <= selectedRating ? 'text-yellow-500' : 'text-gray-300'}`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={feedbackComment}
                                            onChange={(e) => setFeedbackComment(e.target.value)}
                                            placeholder="Add a comment (optional)"
                                            className="w-full p-2 border rounded"
                                            rows="3"
                                        />
                                        <button
                                            onClick={() => handleSubmitFeedback(grievance._id)}
                                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Submit Feedback
                                        </button>
                                    </div>
                                )}
                                {grievance.feedback && (
                                    <div className="mt-4">
                                        <h4 className="text-md font-semibold mb-2">Your Feedback</h4>
                                        <div className="flex items-center space-x-2 mb-2">
                                            {[...Array(5)].map((_, index) => (
                                                <span
                                                    key={index}
                                                    className={`text-2xl ${index < grievance.feedback.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                                                >
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                        {grievance.feedback.comment && (
                                            <p className="text-sm text-gray-600">{grievance.feedback.comment}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard; 