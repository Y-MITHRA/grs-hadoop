import React, { memo } from 'react';

const MessageItem = memo(({ message }) => {
    return (
        <div className={`message ${message.role}`}>
            <div className="message-content">
                {message.content}
            </div>
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem; 