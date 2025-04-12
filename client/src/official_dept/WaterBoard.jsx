const renderGrievanceCard = (grievance) => {
    return (
        <div key={grievance._id} className="grievance-card">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    {/* ... existing card content ... */}
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
                    {(activeTab === 'assigned' || activeTab === 'inProgress') && (
                        <button
                            onClick={() => handleViewChat(grievance)}
                            className="btn btn-secondary"
                        >
                            <FaComments className="mr-2" /> Chat
                        </button>
                    )}
                </div>
            </div>
            {/* ... rest of the card content ... */}
        </div>
    );
};

{/* Grievances List */ }
<div className="grievances-list">
    {loading ? (
        <div className="text-center p-4">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    ) : error ? (
        <div className="alert alert-danger">{error}</div>
    ) : grievances[activeTab].length === 0 ? (
        <div className="text-center p-4">
            <p className="text-muted">No grievances found</p>
        </div>
    ) : (
        <div className="row">
            {grievances[activeTab].map(grievance => (
                <div key={grievance._id} className="col-md-6 mb-3">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">{grievance.title}</h5>
                            <p className="card-text">{grievance.description}</p>
                            <div className="d-flex justify-content-between align-items-center">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setSelectedGrievance(grievance)}
                                >
                                    <FaEye className="me-1" />
                                    View Details
                                </button>
                                {(activeTab === 'assigned' || activeTab === 'inProgress') && (
                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => {
                                            setSelectedGrievance(grievance);
                                            setShowChat(true);
                                        }}
                                    >
                                        <FaComments className="me-1" />
                                        Chat
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )}
</div>

const analyzePriorityLocally = (grievance) => {
    const description = grievance.description?.toLowerCase() || '';
    const title = grievance.title?.toLowerCase() || '';
    const combinedText = `${title} ${description}`;

    // Keywords indicating high priority for Water Board department
    const highPriorityKeywords = [
        'contamination', 'sewage overflow', 'flood', 'burst pipe', 'no water',
        'water quality', 'health hazard', 'drinking water', 'main break',
        'water pollution', 'toxic', 'sewage backup', 'major leak',
        'water shortage', 'emergency repair', 'water outage', 'bacteria',
        'contaminated', 'disease', 'public health'
    ];

    // Keywords indicating medium priority
    const mediumPriorityKeywords = [
        'low pressure', 'leakage', 'water meter', 'billing issue',
        'pipe repair', 'drainage problem', 'water connection',
        'maintenance', 'water supply', 'pipeline', 'water tank',
        'sewage line', 'water testing', 'pump repair', 'water bill'
    ];

    // Count matches for better accuracy
    const highPriorityMatches = highPriorityKeywords.filter(keyword =>
        combinedText.includes(keyword)
    ).length;

    const mediumPriorityMatches = mediumPriorityKeywords.filter(keyword =>
        combinedText.includes(keyword)
    ).length;

    // Determine priority based on keyword matches
    if (highPriorityMatches > 0) {
        return {
            priority: 'High',
            explanation: 'This grievance requires immediate attention due to public health concerns or major service disruption.',
            impactAssessment: 'High impact on public health and water supply services. Immediate action required.',
            recommendedResponseTime: '24 hours'
        };
    } else if (mediumPriorityMatches > 0) {
        return {
            priority: 'Medium',
            explanation: 'This grievance needs attention but is not critical.',
            impactAssessment: 'Moderate impact on water services. Action required within standard timeframe.',
            recommendedResponseTime: '3-5 working days'
        };
    } else {
        return {
            priority: 'Low',
            explanation: 'This is a routine grievance that can be handled through standard procedures.',
            impactAssessment: 'Limited impact on water services. Can be addressed through regular maintenance.',
            recommendedResponseTime: '7-10 working days'
        };
    }
}; 