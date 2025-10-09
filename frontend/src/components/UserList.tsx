import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';

interface UserListProps {
  roomId: number;
}

interface User {
  id: number;
  username: string;
  isOnline: boolean;
  isActive: boolean;
  avatarUrl?: string;
}

const UserList: React.FC<UserListProps> = ({ roomId }) => {
  const { activeUsers } = useAppSelector(state => state.canvas);
  const { user: currentUser } = useAppSelector(state => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  
  // Transform activeUsers from canvas state into our User format
  useEffect(() => {
    if (!activeUsers) return;

    // Create a Map to ensure uniqueness by user ID
    const userMap = new Map<number, User>();

    // Add all active users
    activeUsers
      .filter(activeUser => activeUser && activeUser.userId) // Filter out invalid users
      .forEach(activeUser => {
        userMap.set(activeUser.userId, {
          id: activeUser.userId,
          username: activeUser.username || `User ${activeUser.userId}`,
          isOnline: true,
          isActive: true,
        });
      });

    // Convert Map to array
    const updatedUsers = Array.from(userMap.values());

    setUsers(updatedUsers);
  }, [activeUsers]);

  return (
    <div className="user-list p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Users in Room</h2>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {users.map((user) => (
          <div
            key={`user-${user.id}`}
            className={`flex items-center py-2 ${user.isActive ? 'opacity-100' : 'opacity-50'}`}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium mr-3"
              style={{ backgroundColor: '#718096' }}
            >
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                (user.username && user.username.length > 0) ? user.username.charAt(0).toUpperCase() : '?'
              )}
            </div>
            
            <div className="flex-grow">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  {user.username || `User ${user.id}`}
                  {currentUser && user.id === currentUser.id && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <span 
                className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
              ></span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="py-3 text-center text-gray-500 dark:text-gray-400">
            No users in the room
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;