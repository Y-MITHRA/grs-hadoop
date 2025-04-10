import React from 'react';
import ChatComponent from './ChatComponent';

const GrievanceDetails = ({ grievance }) => {
    console.log('GrievanceDetails received grievance:', {
        id: grievance?._id,
        hasAssignedOfficials: !!grievance?.assignedOfficials,
        assignedOfficialsCount: grievance?.assignedOfficials?.length,
        petitioner: grievance?.petitioner,
        petitionerId: grievance?.petitioner?._id || grievance?.petitioner,
        fullGrievance: grievance
    });

    // Validate required data
    if (!grievance?._id) {
        console.error('Missing grievance ID');
        return <div className="text-red-500">Error: Missing grievance information</div>;
    }

    if (!grievance?.assignedOfficials?.length) {
        console.log('No officials assigned to this grievance');
        return <div className="text-yellow-500">No officials assigned to this grievance yet</div>;
    }

    // Get petitioner ID, handling both direct ID and populated object cases
    const petitionerId = grievance?.petitioner?._id || grievance?.petitioner;
    
    if (!petitionerId) {
        console.error('Missing petitioner ID:', grievance?.petitioner);
        return <div className="text-red-500">Error: Missing petitioner information</div>;
    }

    return (
        <div className="grievance-details">
            {/* Chat Section */}
            <div className="chat-section mt-4">
                <h3>Chat with Official</h3>
                <ChatComponent
                    grievanceId={grievance._id}
                    petitionerId={petitionerId}
                    officialId={grievance.assignedOfficials[0]}
                />
            </div>
        </div>
    );
};

export default GrievanceDetails; 