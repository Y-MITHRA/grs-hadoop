import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = 'pnn5rnnuzvzq';
const STREAM_API_SECRET = '2sxk85mwe8rdpz5bznh4wmf8vjdvpv6cuymacr2damr6a77ea84rk3wcmn9bbzmz';

const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

export const generateToken = async (req, res) => {
    try {
        console.log('\n=== Token Generation Request ===');
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers);
        console.log('Request method:', req.method);
        console.log('Request path:', req.path);

        // Use the authenticated user's ID from the request
        const userId = req.user.id;
        console.log('Generating token for authenticated userId:', userId);

        if (!userId) {
            console.error('No authenticated user found');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('Creating Stream Chat token...');
        const token = serverClient.createToken(userId);
        console.log('Token generated successfully for user:', userId);

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

        // Create a unique channel ID
        const channelId = `grievance-${grievanceId}`;

        // Create a new channel
        const channel = serverClient.channel('messaging', channelId, {
            members: [petitionerId, officialId],
            grievance_id: grievanceId,
            name: `Grievance Chat ${grievanceId}`
        });

        // Create the channel and add members
        await channel.create();
        await channel.addMembers([petitionerId, officialId]);

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