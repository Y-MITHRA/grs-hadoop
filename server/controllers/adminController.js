import Official from '../models/Official.js';
import Grievance from '../models/Grievance.js';

// Get officials by department with case load
export const getOfficialsByDepartment = async (req, res) => {
    try {
        const { department } = req.params;

        // Get all officials from the specified department
        const officials = await Official.find({ department })
            .select('firstName lastName email department designation');

        // Get case load for each official
        const officialsWithCaseLoad = await Promise.all(officials.map(async (official) => {
            // Get count of in-progress cases
            const inProgressCount = await Grievance.countDocuments({
                assignedTo: official._id,
                status: 'in-progress'
            });

            // Get all current cases (pending, assigned, in-progress)
            const currentCases = await Grievance.find({
                assignedTo: official._id,
                status: { $in: ['pending', 'assigned', 'in-progress'] }
            }).select('petitionId title status');

            return {
                ...official.toObject(),
                currentCaseLoad: inProgressCount,
                currentCases
            };
        }));

        res.status(200).json({
            officials: officialsWithCaseLoad
        });
    } catch (error) {
        console.error('Error fetching officials by department:', error);
        res.status(500).json({
            error: 'Failed to fetch officials',
            details: error.message
        });
    }
}; 