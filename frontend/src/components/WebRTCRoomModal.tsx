import React, { useRef, useEffect } from 'react';
import { UseWebRTCRoomReturn } from '../hooks/useWebRTCRoom';
import ParticipantVideo from './ParticipantVideo';
import ParticipantAudioGroup from './ParticipantAudioGroup';

interface WebRTCRoomModalProps {
  webRTCRoom: UseWebRTCRoomReturn;
}

const WebRTCRoomModal: React.FC<WebRTCRoomModalProps> = ({ webRTCRoom }) => {
  const {
    roomState,
    localStream,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    isMuted,
    isVideoOff,
    getFormattedDuration,
  } = webRTCRoom;

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Test audio autoplay capability when room opens
  useEffect(() => {
    if (roomState.isInAudioRoom || roomState.isInVideoRoom) {
      console.log('🎵 Testing audio autoplay capability...');
      const testAudio = document.createElement('audio');
      testAudio.muted = true; // Muted audio usually works
      testAudio.autoplay = true;
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUeCSGNzO/Bdi';
      testAudio.play().then(() => {
        console.log('✅ Audio autoplay is working');
      }).catch((error) => {
        console.warn('⚠️ Audio autoplay blocked - user interaction required:', error);
      });
      document.body.appendChild(testAudio);
      setTimeout(() => testAudio.remove(), 1000);
    }
  }, [roomState.isInAudioRoom, roomState.isInVideoRoom]);

  // Don't render if not in a room
  if (!roomState.isInAudioRoom && !roomState.isInVideoRoom) {
    return null;
  }

  const participantCount = roomState.participants.size;
  const participants = Array.from(roomState.participants.values());
  
  // Create the audio players once to be used in both views
  const AudioPlayers = <ParticipantAudioGroup participants={participants} />;

  // Minimized room UI - floating compact widget
  if (roomState.isMinimized) {
    return (
      <>
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 z-50 min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">
                {roomState.isInAudioRoom ? '🎤' : '📹'}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {roomState.isInAudioRoom ? 'Audio Room' : 'Video Room'}
                </p>
                <p className="text-xs text-green-600 font-mono">
                  {participantCount + 1} users • ⏱️ {getFormattedDuration()}
                </p>
              </div>
            </div>
            <button
              onClick={toggleMinimize}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              title="Maximize"
            >
              📱
            </button>
          </div>
          
          <div className="flex justify-center space-x-2">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg text-sm transition-colors ${
                isMuted 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            {roomState.isInVideoRoom && (
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  isVideoOff 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? '📹❌' : '📹'}
              </button>
            )}
            
            <button
              onClick={leaveRoom}
              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm"
              title="Leave Room"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Render the single, non-duplicated audio player group */}
        {AudioPlayers}
      </>
    );
  }

  // Full room modal - only for video rooms or when not minimized
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-screen overflow-hidden">
          {/* Room Header */}
          <div className="bg-gray-100 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {roomState.isInAudioRoom ? '🎤 Audio Room' : '📹 Video Room'}
                </h3>
                <p className="text-sm text-gray-600">
                  {participantCount + 1} participant{participantCount !== 0 ? 's' : ''} • ⏱️ {getFormattedDuration()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMinimize}
                  className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                  title="Minimize"
                >
                  ➖
                </button>
                <button
                  onClick={leaveRoom}
                  className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                  title="Leave Room"
                >
                  🚪
                </button>
              </div>
            </div>
          </div>

          {/* Video Grid for Video Room */}
          {roomState.isInVideoRoom && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-gray-900 min-h-[400px]">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ display: localStream && !isVideoOff ? 'block' : 'none' }}
                />
                {(!localStream || isVideoOff) && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="text-4xl mb-2">👤</div>
                      <p className="text-sm">You</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  You {isMuted && '🔇'}
                </div>
              </div>

              {/* Remote Videos - Using ParticipantVideo component */}
              {participants.map((participant) => (
                <ParticipantVideo key={participant.userId} participant={participant} />
              ))}
            </div>
          )}

          {/* Audio Room Interface */}
          {roomState.isInAudioRoom && (
            <div className="py-20 text-center bg-gradient-to-b from-blue-50 to-blue-100">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Audio Room
              </h3>
              <p className="text-gray-600 mb-4">
                {participantCount + 1} participant{participantCount !== 0 ? 's' : ''} connected
              </p>
              
              {/* Participants in audio room */}
              {participants.length > 0 && (
                <div className="max-w-md mx-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {participants.map((participant) => (
                      <div key={participant.userId} className="bg-white bg-opacity-50 rounded-lg p-3">
                        <div className="text-2xl mb-1">👤</div>
                        <p className="text-sm font-medium">{participant.userName}</p>
                        {participant.isMuted && <span className="text-xs text-red-500">🔇</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Room Controls */}
          <div className="bg-gray-100 px-4 py-3 flex justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-lg transition-colors ${
                isMuted 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            {roomState.isInVideoRoom && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-lg transition-colors ${
                  isVideoOff 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? '📹❌' : '📹'}
              </button>
            )}
            
            <button
              onClick={leaveRoom}
              className="p-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="Leave Room"
            >
              🚪 Leave Room
            </button>
          </div>
        </div>
      </div>

      {/* Render the single, non-duplicated audio player group */}
      {AudioPlayers}
    </>
  );
};

export default WebRTCRoomModal;