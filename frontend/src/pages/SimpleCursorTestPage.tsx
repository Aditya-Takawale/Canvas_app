import React from 'react';
import SimpleCanvas from '../components/SimpleCanvas';

const SimpleCursorTestPage: React.FC = () => {
  return (
    <div className="h-screen w-screen">
      <SimpleCanvas roomId={1} />
    </div>
  );
};

export default SimpleCursorTestPage;