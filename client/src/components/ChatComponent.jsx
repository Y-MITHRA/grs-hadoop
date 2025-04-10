import React, { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import {
    Chat,
    Channel,
    ChannelHeader,
    MessageList,
    MessageInput,
    Window,
    Thread,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { useAuth } from '../context/AuthContext';

const STREAM_API_KEY = 'pnn5rnnuzvzq';

const ChatComponent = ({ grievanceId, petitionerId, officialId }) => {
    const { user } = useAuth();
    const [client, setClient] = useState(null);
    const [channel, setChannel] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initChat = async () => {
            try {
                setLoading(true);
                console.log('Chat initialization data:', {
                    currentUser: {
                        id: user?.id,
                        name: user?.name,
                        email: user?.email,
                        role: user?.role
                    },
                    grievanceData: {
                        grievanceId,
                        petitionerId,
                        officialId
                    }
                });

                // Validate user context
                if (!user) {
                    throw new Error('User context is not available. Please log in again.');
                }

                if (!user.id) {
                    throw new Error('User ID is missing. Please log in again.');
                }

                // Validate required props
                if (!grievanceId) {
                    throw new Error('Grievance ID is missing');
                }

                // For petitioner view
                if (user.role === 'petitioner' && !officialId) {
                    throw new Error('Official ID is missing');
                }

                // For official view
                if (user.role === 'official' && !petitionerId) {
                    throw new Error('Petitioner ID is missing');
                }

                // Get token from backend
                const tokenResponse = await fetch('http://localhost:5000/api/chat/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ userId: user.id })
                });

                if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text();
                    console.error('Token response error:', errorText);
                    throw new Error(`Failed to get chat token: ${tokenResponse.status}`);
                }

                const tokenData = await tokenResponse.json();
                console.log('Received token data:', { hasToken: !!tokenData.token });

                if (!tokenData.token) {
                    throw new Error('No token received from server');
                }

                // Initialize chat client
                const chatClient = StreamChat.getInstance(STREAM_API_KEY);
                console.log('Created Stream Chat client');

                // Connect user
                await chatClient.connectUser(
                    {
                        id: user.id,
                        name: user.name || user.email,
                        email: user.email
                    },
                    tokenData.token
                );
                console.log('Connected user to Stream Chat');

                // Create or join channel
                const channelId = `grievance-${grievanceId}`;
                console.log('Creating channel with ID:', channelId);

                // Determine member IDs based on user role
                let memberIds;
                if (user.role === 'petitioner') {
                    memberIds = [String(user.id), String(officialId)];
                } else {
                    memberIds = [String(petitionerId), String(user.id)];
                }
                console.log('Channel members:', memberIds);

                const channel = chatClient.channel('messaging', channelId, {
                    name: `Grievance Chat ${grievanceId}`,
                    grievance_id: grievanceId,
                    members: memberIds
                });

                console.log('Channel created, watching...');
                await channel.watch();
                console.log('Channel watch completed');

                setChannel(channel);
                setClient(chatClient);
                setError(null);
            } catch (error) {
                console.error('Error in chat initialization:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        initChat();

        return () => {
            if (client) {
                console.log('Disconnecting user from Stream Chat');
                client.disconnectUser();
            }
        };
    }, [user, grievanceId, petitionerId, officialId]);

    if (error) {
        return (
            <div className="text-red-500 p-4">
                <h4>Chat Error:</h4>
                <p>{error}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4">Initializing chat...</p>
                </div>
            </div>
        );
    }

    if (!client || !channel) {
        return (
            <div className="text-red-500 p-4">
                <p>Failed to initialize chat. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="h-[600px]">
            <Chat client={client} theme="messaging light">
                <Channel channel={channel}>
                    <Window>
                        <ChannelHeader />
                        <MessageList />
                        <MessageInput />
                    </Window>
                    <Thread />
                </Channel>
            </Chat>
        </div>
    );
};

export default ChatComponent; 