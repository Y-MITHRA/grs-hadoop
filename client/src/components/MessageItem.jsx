import React from 'react';
import './MessageItem.css';

const MessageItem = ({ message }) => {
    const { role, content } = message;

    return (
        <div className={`message ${role}`}>
            <div className="message-content">
                <div className="message-text">{content}</div>
            </div>
        </div>
    );
};

export default MessageItem;