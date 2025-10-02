import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { Socket } from 'socket.io-client';
import { createChatSocket } from '../services/chatSocket';
import { SocketEvents } from '../utils/constants';

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}

interface ChatPanelProps {
  roomId: number;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ roomId }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  // Stable user reference to prevent useEffect re-runs
  const userId = useMemo(() => user?.id, [user?.id]);
  const username = useMemo(() => user?.username, [user?.username]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Connect to socket for chat
  useEffect(() => {
    if (!userId) {
      console.log('🗨️ ChatPanel: No user ID found, skipping chat socket connection');
      return;
    }
    
    // Get token from localStorage if available
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, skipping chat socket connection');
      return;
    }
    
    console.log('�️ Initializing dedicated chat socket connection to room:', roomId);
    
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('Using socket URL:', socketUrl);
    
    socketRef.current = createChatSocket({
      url: socketUrl,
      roomId,
      userId: userId,
      token,
      // Event handlers
      onConnect: () => {
        console.log('�️ Chat socket connected for room', roomId);
        setSocketConnected(true);
        addSystemMessage('Connected to chat');
      },
      onDisconnect: (reason) => {
        console.log('🗨️ Chat socket disconnected', { reason });
        setSocketConnected(false);
        addSystemMessage('Disconnected from chat: ' + reason);
      },
      onConnectError: (error) => {
        console.error('�️ Chat socket connection error:', error);
        setSocketConnected(false);
        addSystemMessage('Connection error: ' + error.message);
      },
      onChatMessage: (chatMessage) => {
        console.log('�️ Received chat message:', chatMessage);
        addMessage(chatMessage);
      },
      onUserJoined: (userData) => {
        console.log('�️ User joined room:', userData);
        addSystemMessage(`${userData.username} joined the room`);
      },
      onUserLeft: (userData) => {
        console.log('�️ User left room:', userData);
        addSystemMessage(`${userData.username} left the room`);
      }
    });
    
    // Connect to the socket server
    socketRef.current.connect();
    
    // Setup a reconnection timer to handle cases where socket doesn't connect initially
    const reconnectTimer = setInterval(() => {
      if (socketRef.current && !socketRef.current.isConnected()) {
        console.log('�️ Attempting to reconnect chat socket...');
        socketRef.current.connect();
      }
    }, 5000);
    
    return () => {
      clearInterval(reconnectTimer);
      if (socketRef.current) {
        console.log('�️ Disconnecting chat socket for cleanup');
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId]);  // Use stable userId instead of user object
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const addMessage = (chatMessage: ChatMessage) => {
    setMessages(prev => [...prev, chatMessage]);
  };
  
  const addSystemMessage = (text: string) => {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      userId: 0,
      username: 'System',
      message: text,
      timestamp: new Date().toISOString(),
      isSystem: true,
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !socketRef.current || !userId || !username) {
      return;
    }
    
    console.log('🗨️ Sending chat message:', { message: message.trim(), roomId, userId });
    
    // Create local chat message object
    const chatMessage = {
      id: `local-${Date.now()}`,
      userId: userId,
      username: username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };
    
    // Send message via socket
    socketRef.current.sendMessage({ message: message.trim() });
    
    // Add message to local state immediately
    addMessage(chatMessage);
    
    // Clear input
    setMessage('');
  };
  
  // Format timestamp to readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="chat-header border-b border-gray-200 dark:border-gray-700 p-3">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">Chat</h3>
        <div className="flex items-center">
          <span 
            className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}
          ></span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="chat-messages flex-grow overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            No messages yet. Start the conversation!
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`mb-3 ${
              msg.isSystem
                ? 'text-center'
                : msg.userId === user?.id
                ? 'text-right'
                : 'text-left'
            }`}
          >
            {msg.isSystem ? (
              <div className="inline-block text-xs text-gray-500 dark:text-gray-400 py-1 px-2 bg-gray-100 dark:bg-gray-700 rounded">
                {msg.message}
              </div>
            ) : msg.userId === user?.id ? (
              <div className="flex flex-col items-end">
                <div className="bg-blue-600 text-white py-2 px-3 rounded-lg max-w-xs break-words text-left">
                  {msg.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(msg.timestamp)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start">
                <div className="flex items-center mb-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {msg.username}
                  </span>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white py-2 px-3 rounded-lg max-w-xs break-words">
                  {msg.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(msg.timestamp)}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input border-t border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSendMessage} className="flex">
          <input
            id="chat-message"
            name="chat-message"
            type="text"
            className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!socketConnected}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!socketConnected || !message.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;