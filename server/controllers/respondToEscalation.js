import Grievance from '../models/Grievance.js';
import Official from '../models/Official.js';
import Notification from '../models/Notification.js';
import { StreamChat } from 'stream-chat';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Stream API credentials from environment variables
const STREAM_API_KEY = process.env.STREAM_API_KEY || 'pnn5rnnuzvzq';
const STREAM_API_SECRET = process.env.STREAM_API_SECRET || '2sxk85mwe8rdpz5bznh4wmf8vjdvpv6cuymacr2damr6a77ea84rk3wcmn9bbzmz';

// Initialize Stream Chat client with API key and secret
const serverClient = new StreamChat(STREAM_API_KEY, STREAM_API_SECRET);

export const respondToEscalation = async (req, res) => {
    try {
        const { id } = req.params;
        const { escalationResponse, newStatus, newAssignedTo, isReassignment } = req.body;
        const adminId = req.user?.id;

        // Validate admin user
        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized - Admin ID not found' });
        }

        // Validate required fields
        if (!escalationResponse?.trim()) {
            return res.status(400).json({ error: 'Escalation response is required' });
        }

        // Find and update the grievance
        const grievance = await Grievance.findById(id)
            .populate('petitioner', 'firstName lastName')
            .populate('assignedTo', 'firstName lastName');

        if (!grievance) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        // Verify that the grievance is actually escalated
        if (!grievance.isEscalated) {
            return res.status(400).json({ error: 'This grievance is not escalated' });
        }

        // Update grievance fields
        grievance.escalationResponse = escalationResponse.trim();
        grievance.escalationStatus = 'Resolved';

        // Handle reassignment
        if (isReassignment && newAssignedTo) {
            try {
                // Verify the new official exists
                const newOfficial = await Official.findById(newAssignedTo)
                    .select('firstName lastName email');
                if (!newOfficial) {
                    return res.status(400).json({ error: 'Selected official not found' });
                }

                const previousOfficialId = grievance.assignedTo?._id;
                const previousStatus = grievance.status; // Store previous status

                // Update assigned official
                grievance.assignedTo = newAssignedTo;

                // Update assignedOfficials array
                if (!grievance.assignedOfficials) {
                    grievance.assignedOfficials = [];
                }
                if (!grievance.assignedOfficials.includes(newAssignedTo)) {
                    grievance.assignedOfficials.push(newAssignedTo);
                }

                // Update chat channel membership in Stream Chat
                try {
                    const channelId = `grievance-${id}`;
                    console.log(`Updating chat channel members for channel ${channelId}`);

                    // Check if channel exists
                    const existingChannels = await serverClient.queryChannels({ id: channelId });

                    if (existingChannels && existingChannels.length > 0) {
                        console.log('Channel exists, updating members');
                        const channel = serverClient.channel('messaging', channelId);

                        // Remove previous official if different
                        if (previousOfficialId && previousOfficialId.toString() !== newAssignedTo.toString()) {
                            await channel.removeMembers([previousOfficialId.toString()]);
                            console.log(`Removed previous official ${previousOfficialId} from channel`);
                        }

                        // Add new official
                        await channel.addMembers([newAssignedTo.toString()]);
                        console.log(`Added new official ${newAssignedTo} to channel`);

                        console.log(`Updated chat channel members for channel ${channelId}`);
                    } else {
                        // Create new channel with correct members
                        console.log('Channel does not exist, creating new one');
                        const newChannel = serverClient.channel('messaging', channelId, {
                            members: [
                                grievance.petitioner._id.toString(),
                                newAssignedTo.toString()
                            ],
                            created_by_id: 'system',
                            name: `Grievance Chat ${grievance.petitionId || id}`,
                            grievance_id: id
                        });

                        await newChannel.create();
                        console.log(`Created new chat channel ${channelId}`);
                    }
                } catch (chatError) {
                    console.error('Error updating chat channel:', chatError);
                    // Continue with process even if chat channel update fails
                }

                // Always preserve the previous status if it was in-progress
                if (previousStatus === 'in-progress') {
                    grievance.status = 'in-progress';

                    // Add timeline entry for reassignment with resource context
                    grievance.timelineStages.push({
                        stageName: 'Reassigned',
                        date: new Date(),
                        description: `${grievance.priority} Priority Grievance reassigned to ${newOfficial.firstName} ${newOfficial.lastName}. Previous resource requirements and in-progress status maintained.`
                    });

                    // Notification for new official about existing resources and status
                    try {
                        await Notification.create({
                            recipient: newAssignedTo,
                            recipientType: 'Official',
                            type: 'CASE_REASSIGNED',
                            message: `You have been assigned grievance #${grievance.petitionId} which is currently in-progress. This case has existing resource requirements that were previously submitted.`,
                            grievanceId: grievance._id
                        });
                        console.log(`Notification created for new official: ${newAssignedTo} (in-progress case)`);
                    } catch (notifError) {
                        console.error('Failed to create notification for new official:', notifError);
                    }
                } else {
                    // For other statuses, set to assigned
                    grievance.status = 'assigned';

                    // Add timeline entry for reassignment
                    grievance.timelineStages.push({
                        stageName: 'Reassigned',
                        date: new Date(),
                        description: `${grievance.priority} Priority Grievance reassigned to ${newOfficial.firstName} ${newOfficial.lastName}.`
                    });

                    // Regular notification for new official
                    try {
                        await Notification.create({
                            recipient: newAssignedTo,
                            recipientType: 'Official',
                            type: 'CASE_ASSIGNED',
                            message: `You have been assigned grievance #${grievance.petitionId}.`,
                            grievanceId: grievance._id
                        });
                        console.log(`Notification created for new official: ${newAssignedTo}`);
                    } catch (notifError) {
                        console.error('Failed to create notification for new official:', notifError);
                    }
                }

                // Notification for the petitioner
                await Notification.create({
                    recipient: grievance.petitioner._id,
                    recipientType: 'Petitioner',
                    type: 'CASE_REASSIGNED',
                    message: `Your grievance #${grievance.petitionId} has been reassigned to a new official${previousStatus === 'in-progress' ? ' and will continue in progress' : ''}. Admin Response: ${escalationResponse.trim()}`,
                    grievanceId: grievance._id
                });

                // Remove the previous official from assignedOfficials array if different
                if (previousOfficialId && previousOfficialId.toString() !== newAssignedTo.toString()) {
                    grievance.assignedOfficials = grievance.assignedOfficials.filter(
                        official => official.toString() !== previousOfficialId.toString()
                    );

                    // Notification for the previous official
                    try {
                        await Notification.create({
                            recipient: previousOfficialId,
                            recipientType: 'Official',
                            type: 'CASE_REASSIGNED',
                            message: `Grievance #${grievance.petitionId} has been reassigned to another official and will no longer appear in your dashboard. Admin Response: ${escalationResponse.trim()}`,
                            grievanceId: grievance._id
                        });
                        console.log(`Notification created for previous official: ${previousOfficialId}`);
                    } catch (notifError) {
                        console.error('Failed to create notification for previous official:', notifError);
                    }
                }
            } catch (error) {
                console.error('Error during reassignment:', error);
                return res.status(500).json({
                    error: 'Failed to process reassignment',
                    details: error.message
                });
            }
        } else {
            // If no reassignment, just notify the petitioner about the escalation response
            try {
                await Notification.create({
                    recipient: grievance.petitioner._id,
                    recipientType: 'Petitioner',
                    type: 'ESCALATION_RESPONSE',
                    message: `Admin has addressed your escalation for grievance #${grievance.petitionId}. Response: ${escalationResponse.trim()}`,
                    grievanceId: grievance._id,
                    createdAt: new Date()
                });

                // Also notify the current assigned official
                if (grievance.assignedTo) {
                    await Notification.create({
                        recipient: grievance.assignedTo._id,
                        recipientType: 'Official',
                        type: 'ESCALATION_RESPONSE',
                        message: `Admin has addressed the escalation for grievance #${grievance.petitionId} that you are handling.`,
                        grievanceId: grievance._id,
                        createdAt: new Date()
                    });
                }
            } catch (notificationError) {
                console.error('Error creating notifications:', notificationError);
                // Continue with the process even if notifications fail
            }
        }

        // Add escalation response to timeline
        grievance.statusHistory.push({
            status: grievance.status, // Use current status
            updatedBy: adminId,
            updatedByType: 'admin',
            comment: `Admin responded to escalation: ${escalationResponse.trim()}`
        });

        // Add timeline entry for escalation response
        grievance.timelineStages.push({
            stageName: 'Resolution',
            date: new Date(),
            description: `Escalation addressed by Admin with response: ${escalationResponse.trim()}`
        });

        // Save the updated grievance
        await grievance.save();

        res.json({
            message: 'Escalation response submitted successfully',
            grievance
        });
    } catch (error) {
        console.error('Error responding to escalation:', error);
        res.status(500).json({
            error: 'Failed to save grievance update',
            details: error.message
        });
    }
}; 