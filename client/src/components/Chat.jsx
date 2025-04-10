import React, { useEffect, useState } from 'react';
import {
    StreamChat,
    Chat as StreamChatComponent,
    Channel,
    Window,
    MessageList,
    MessageInput,
    ChannelHeader
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import { useAuth } from '../context/AuthContext';

const chatClient = StreamChat.getInstance('pnn5rnnuzvzq');

const Chat = ({ grievanceId, petitionerId, officialId }) => {
    const { user, authenticatedFetch } = useAuth();
    const [channel, setChannel] = useState(null);

    useEffect(() => {
        const initializeChat = async () => {
            try {
                // Get Stream Chat token
                const response = await authenticatedFetch('/api/chat/token');
                if (!response.ok) {
                    throw new Error('Failed to get chat token');
                }
                const { token } = await response.json();

                // Connect user to Stream Chat
                await chatClient.connectUser(
                    {
                        id: user.id,
                        name: user.name || user.email,
                        image: user.avatar
                    },
                    token
                );

                // Create or get channel
                const channelId = `grievance-${grievanceId}`;
                const channel = chatClient.channel('messaging', channelId, {
                    members: [petitionerId, officialId],
                    grievance_id: grievanceId
                });

                await channel.watch();
                setChannel(channel);
            } catch (error) {
                console.error('Error initializing chat:', error);
            }
        };

        if (user && grievanceId && petitionerId && officialId) {
            initializeChat();
        }

        return () => {
            chatClient.disconnectUser();
        };
    }, [user, grievanceId, petitionerId, officialId]);

    if (!channel) {
        return <div>Loading chat...</div>;
    }

    return (
        <div className="chat-container" style={{ height: '500px' }}>
            <StreamChatComponent client={chatClient} theme="messaging light">
                <Channel channel={channel}>
                    <Window>
                        <ChannelHeader />
                        <MessageList />
                        <MessageInput />
                    </Window>
                </Channel>
            </StreamChatComponent>
        </div>
    );
};

export default Chat; 