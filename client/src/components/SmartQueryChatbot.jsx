import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MessageItem from './MessageItem';
import api, { isTokenValid } from '../utils/api';
import './SmartQueryChatbot.css';

const SmartQueryChatbot = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const messagesRef = useRef([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        checkAuthAndLoadMessages();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const checkAuthAndLoadMessages = async () => {
        const token = localStorage.getItem('token');
        console.log('Checking authentication with token:', token);

        try {
            const isValid = await isTokenValid();
            if (!isValid) {
                console.log('Token validation failed in SmartQueryChatbot');
                setIsAuthenticated(false);
                setError('Your session has expired or is invalid. Please log in again.');
                localStorage.setItem('redirectAfterLogin', location.pathname);
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }

            console.log('Token verified with backend');
            setIsAuthenticated(true);
            setError(null);
            await loadMessageHistory();
        } catch (error) {
            console.error('Auth verification failed:', error);
            setIsAuthenticated(false);
            setError('Authentication failed. Please log in again.');
            localStorage.setItem('redirectAfterLogin', location.pathname);
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const focusInput = useCallback(() => {
        if (inputRef.current && isAuthenticated) {
            inputRef.current.focus();
        }
    }, [isAuthenticated]);

    const loadMessageHistory = async () => {
        try {
            setError(null);
            console.log('Loading message history...');
            const response = await api.get('/smart-query/messages');
            console.log('Message history response:', response.data);

            if (response.data.messages) {
                updateMessages(response.data.messages);
            }
        } catch (error) {
            console.error('Error loading message history:', error);

            if (error.message === 'AUTH_REQUIRED' || error.isAuthError) {
                setIsAuthenticated(false);
                setError('Your session has expired. Please log in again.');
                localStorage.setItem('redirectAfterLogin', location.pathname);
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                setError('Failed to load message history. Please try refreshing the page.');
            }
        }
    };

    const updateMessages = useCallback((newMessages) => {
        messagesRef.current = newMessages;
        setMessages(newMessages);
    }, []);

    const addMessage = useCallback((message) => {
        const newMessages = [...messagesRef.current, message];
        updateMessages(newMessages);
    }, [updateMessages]);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    const handleSend = async () => {
        if (!isAuthenticated) {
            setError('Please log in to send messages.');
            localStorage.setItem('redirectAfterLogin', location.pathname);
            navigate('/login');
            return;
        }

        const content = inputRef.current?.innerText.trim();
        if (!content) return;

        try {
            setLoading(true);
            setError(null);

            // Clear input immediately
            inputRef.current.innerText = '';

            // Add user message to chat immediately
            const userMessage = { role: 'user', content };
            addMessage(userMessage);

            // Send query to server
            const response = await api.post('/smart-query/query', { query: content });

            // Add assistant response to chat
            if (response.data.response) {
                const assistantMessage = {
                    role: 'assistant',
                    content: response.data.response
                };
                addMessage(assistantMessage);
            }
        } catch (error) {
            console.error('Error processing query:', error);
            let errorMessage = 'Sorry, I encountered an error processing your query. Please try again.';

            if (error.message === 'AUTH_REQUIRED' || error.isAuthError) {
                errorMessage = 'Your session has expired. Please log in again.';
                setIsAuthenticated(false);
                localStorage.setItem('redirectAfterLogin', location.pathname);
                localStorage.removeItem('token');
                navigate('/login');
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            addMessage({
                role: 'assistant',
                content: errorMessage
            });
            setError(errorMessage);
        } finally {
            setLoading(false);
            focusInput();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const handleClearChat = async () => {
        try {
            setLoading(true);
            await api.delete('/smart-query/messages');
            updateMessages([]);
            setError(null);
        } catch (error) {
            console.error('Error clearing chat:', error);
            setError('Failed to clear chat history');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="smart-query-chatbot">
            <div className="chat-header">
                <div className="header-content">
                    <h2>Smart Query Assistant</h2>
                    <p>Ask questions about grievances, resources, and escalations in natural language</p>
                </div>
                <button
                    className="clear-chat-button"
                    onClick={handleClearChat}
                    disabled={loading || !isAuthenticated || messages.length === 0}
                >
                    Clear Chat
                </button>
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        {(!isAuthenticated || error.includes('log in')) && (
                            <button
                                className="login-button"
                                onClick={() => {
                                    localStorage.setItem('redirectAfterLogin', location.pathname);
                                    navigate('/login');
                                }}
                            >
                                Log In
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <MessageItem key={index} message={msg} />
                ))}
                {loading && (
                    <div className="message assistant">
                        <div className="message-content loading">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
                <div
                    ref={inputRef}
                    className="input-editable"
                    contentEditable={isAuthenticated && !error}
                    onKeyPress={handleKeyPress}
                    onPaste={handlePaste}
                    data-placeholder={!isAuthenticated ? 'Please log in to send messages' : 'Ask a question...'}
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !isAuthenticated || error}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default SmartQueryChatbot; 