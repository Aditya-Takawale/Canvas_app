import React from 'react';
import { useAppSelector } from '../hooks/redux';

const DebugPage: React.FC = () => {
  const { user, isAuthenticated, token } = useAppSelector(state => state.auth);
  const { rooms, loading, error } = useAppSelector(state => state.room);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Authentication Status:</h2>
          <p>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {user ? JSON.stringify(user) : 'null'}</p>
          <p>Token: {token ? 'Present' : 'Missing'}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Room State:</h2>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Error: {error || 'None'}</p>
          <p>Rooms Count: {rooms?.length || 0}</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Current URL:</h2>
          <p>{window.location.href}</p>
          <p>Pathname: {window.location.pathname}</p>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;