import React from 'react';
import { Spinner } from './Spinner';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false 
}) => {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-80 dark:bg-gray-900 dark:bg-opacity-80'
    : 'flex flex-col items-center justify-center py-4';

  return (
    <div className={containerClasses} data-testid="loading-spinner">
      <div className="flex flex-col items-center">
        <Spinner size={size} />
        {message && (
          <p className="mt-3 text-gray-600 dark:text-gray-300 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;