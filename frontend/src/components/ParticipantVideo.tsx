import React, { useRef, useEffect } from 'react';
import { RoomParticipant } from '../hooks/useWebRTCRoom';

interface ParticipantVideoProps {
  participant: RoomParticipant;
}

// Component to handle remote participant's video stream with stable ref
const ParticipantVideo = React.memo<ParticipantVideoProps>(({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && participant.stream) {
      console.log('📹 Setting video stream for:', participant.userName);
      videoElement.srcObject = participant.stream;
      
      // Add event listeners for debugging
      const handleLoadedData = () => {
        console.log('🎬 Video loaded for:', participant.userName);
      };
      
      const handlePlaying = () => {
        console.log('▶️ Video playing for:', participant.userName);
      };
      
      const handleError = (e: Event) => {
        console.error('❌ Video error for:', participant.userName, e);
      };

      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('playing', handlePlaying);
      videoElement.addEventListener('error', handleError);
      
      // Cleanup function
      return () => {
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('playing', handlePlaying);
        videoElement.removeEventListener('error', handleError);
      };
    }
  }, [participant.stream, participant.userName]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-sm">Connecting...</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        {participant.userName} {participant.isMuted && '🔇'}
      </div>
    </div>
  );
});

ParticipantVideo.displayName = 'ParticipantVideo';

export default ParticipantVideo;