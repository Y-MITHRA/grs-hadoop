import { StreamChat } from 'stream-chat';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Stream API credentials from environment variables
const STREAM_API_KEY = process.env.STREAM_API_KEY || 'pnn5rnnuzvzq';
const STREAM_API_SECRET = process.env.STREAM_API_SECRET || '2sxk85mwe8rdpz5bznh4wmf8vjdvpv6cuymacr2damr6a77ea84rk3wcmn9bbzmz';

// Initialize Stream Chat client with API key and secret
const serverClient = new StreamChat(STREAM_API_KEY, STREAM_API_SECRET);

export const generateToken = async (req, res) => {
    try {
        console.log('\n=== Token Generation Request ===');
        console.log('Request method:', req.method);
        console.log('Request path:', req.path);

        // Use the authenticated user's ID from the request
        const userId = req.user.id;

        // Get user role from request body or fall back to user context
        const userRole = (req.body && req.body.userRole) || req.user.role || 'petitioner';

        console.log('Generating token for authenticated userId:', userId, 'role:', userRole);

        if (!userId) {
            console.error('No authenticated user found');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('Creating token...');

        // Map application roles to Stream Chat roles
        // Stream Chat roles: 'admin', 'channel_member', 'channel_moderator', 'guest', 'messaging_restricted_user', 'moderator', 'user'
        let streamRole;

        switch (userRole.toLowerCase()) {
            case 'admin':
                streamRole = 'admin';
                break;
            case 'official':
                // Use 'moderator' role which has more permissions including ReadChannel
                streamRole = 'moderator';
                break;
            case 'petitioner':
                streamRole = 'user';
                break;
            default:
                streamRole = 'user'; // default fallback
        }

        console.log(`Mapping application role '${userRole}' to Stream role '${streamRole}'`);

        // Create token with explicit role
        const token = serverClient.createToken(userId.toString());

        console.log('Token generated successfully for user:', userId, 'with Stream role:', streamRole);

        // Update user in StreamChat with proper role
        try {
            await serverClient.upsertUser({
                id: userId.toString(),
                role: streamRole
            });
            console.log(`Updated user ${userId} with role ${streamRole} in Stream`);
        } catch (upsertError) {
            console.error('Error updating user role in Stream:', upsertError);
            // Continue even if upsert fails - the token will still work
        }

        res.json({ token });
    } catch (error) {
        console.error('\nError generating Stream Chat token:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: 'Failed to generate chat token' });
    }
};

export const createChannel = async (req, res) => {
    try {
        const { grievanceId, petitionerId, officialId } = req.body;

        if (!grievanceId || !petitionerId || !officialId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Create a unique channel ID
        const channelId = `grievance-${grievanceId}`;

        console.log('Creating new chat channel:', channelId);
        console.log('Members:', { petitionerId, officialId });

        try {
            // Ensure users exist with proper roles in Stream before adding to channel
            await serverClient.upsertUsers([
                {
                    id: petitionerId.toString(),
                    role: 'user'
                },
                {
                    id: officialId.toString(),
                    role: 'moderator'
                }
            ]);

            // Check if channel already exists
            const existingChannel = await serverClient.queryChannels({ id: channelId });

            if (existingChannel && existingChannel.length > 0) {
                console.log('Channel already exists, updating members');
                const channel = serverClient.channel('messaging', channelId);

                // Update members to ensure both petitioner and official are included
                await channel.addMembers([
                    petitionerId.toString(),
                    officialId.toString()
                ]);

                return res.json({
                    channelId,
                    message: 'Chat channel updated successfully'
                });
            }
        } catch (error) {
            console.log('Error checking existing channel:', error);
            // Continue to create a new channel
        }

        // Create a new channel
        const channel = serverClient.channel('messaging', channelId, {
            members: [petitionerId.toString(), officialId.toString()],
            created_by_id: 'system',
            grievance_id: grievanceId,
            name: `Grievance Chat ${grievanceId}`
        });

        // Create the channel
        await channel.create();

        console.log('Channel created successfully');

        res.json({
            channelId,
            message: 'Chat channel created successfully'
        });
    } catch (error) {
        console.error('Error creating chat channel:', error);
        res.status(500).json({ error: 'Failed to create chat channel' });
    }
};

export const deleteChannel = async (req, res) => {
    try {
        const { channelId } = req.params;
        const channel = serverClient.channel('messaging', channelId);
        await channel.delete();

        res.json({ message: 'Chat channel deleted successfully' });
    } catch (error) {
        console.error('Error deleting chat channel:', error);
        res.status(500).json({ error: 'Failed to delete chat channel' });
    }
}; 