import React from 'react';
import { UseWebRTCRoomReturn } from '../hooks/useWebRTCRoom';

interface RoomControlsProps {
  webRTCRoom: UseWebRTCRoomReturn;
}

const RoomControls: React.FC<RoomControlsProps> = ({ webRTCRoom }) => {
  const {
    roomState,
    joinAudioRoom,
    joinVideoRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    getFormattedDuration,
  } = webRTCRoom;

  const participantCount = roomState.participants.size;
  const isInRoom = roomState.isInAudioRoom || roomState.isInVideoRoom;

  // Debug room state
  console.log('🏠 RoomControls render:', {
    isInRoom,
    isInAudioRoom: roomState.isInAudioRoom,
    isInVideoRoom: roomState.isInVideoRoom,
    participantCount,
    participants: Array.from(roomState.participants.values())
  });

  // Manual audio test function to bypass autoplay restrictions
  const testAllAudio = () => {
    console.log('🧪 Manual audio test triggered by user interaction');
    
    // Find all audio elements and try to play them
    const audioElements = document.querySelectorAll('audio');
    console.log('🔍 Found', audioElements.length, 'audio elements');
    
    audioElements.forEach((audio, index) => {
      console.log(`🎵 Testing audio element ${index}:`, {
        src: audio.src,
        srcObject: !!audio.srcObject,
        paused: audio.paused,
        muted: audio.muted,
        volume: audio.volume
      });
      
      if (audio.srcObject) {
        audio.play()
          .then(() => console.log(`✅ Successfully played audio element ${index}`))
          .catch(error => console.error(`❌ Failed to play audio element ${index}:`, error));
      }
    });

    // Also test participant streams directly
    roomState.participants.forEach((participant) => {
      if (participant.stream) {
        console.log('🎵 Testing stream for participant:', participant.userName);
        const testAudio = document.createElement('audio');
        testAudio.srcObject = participant.stream;
        testAudio.volume = 1.0;
        testAudio.play()
          .then(() => {
            console.log('✅ Stream test successful for:', participant.userName);
            setTimeout(() => testAudio.remove(), 2000);
          })
          .catch(error => {
            console.error('❌ Stream test failed for:', participant.userName, error);
            testAudio.remove();
          });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Room Status */}
      {isInRoom && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-green-600">
                {roomState.isInAudioRoom ? '🎤' : '📹'}
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  {roomState.isInAudioRoom ? 'Audio Room' : 'Video Room'}
                </p>
                <p className="text-xs text-green-600">
                  {participantCount + 1} participant{participantCount !== 0 ? 's' : ''} • ⏱️ {getFormattedDuration()}
                </p>
              </div>
            </div>
            <div className="flex space-x-1">
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
              
              <button
                onClick={testAllAudio}
                className="p-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white transition-colors text-sm"
                title="Test Audio (Force Play)"
              >
                🧪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Buttons */}
      {!isInRoom && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-3">WebRTC Rooms</p>
          
          <button
            onClick={() => {
              console.log('🎯 Audio room button clicked');
              joinAudioRoom().catch(error => {
                console.error('❌ Failed to join audio room:', error);
              });
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <span className="text-lg">🎤</span>
            <span>Join Audio Room</span>
          </button>
          
          <button
            onClick={() => {
              console.log('🎯 Video room button clicked');
              joinVideoRoom().catch(error => {
                console.error('❌ Failed to join video room:', error);
              });
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <span className="text-lg">📹</span>
            <span>Join Video Room</span>
          </button>
        </div>
      )}

      {/* Participants List */}
      {isInRoom && participantCount > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Other Participants</p>
          <div className="space-y-1">
            {Array.from(roomState.participants.values()).map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <div className="text-sm">👤</div>
                  <span className="text-sm font-medium">{participant.userName}</span>
                </div>
                <div className="flex space-x-1">
                  {participant.isMuted && (
                    <span className="text-xs text-red-500" title="Muted">🔇</span>
                  )}
                  {participant.isVideoOff && roomState.isInVideoRoom && (
                    <span className="text-xs text-red-500" title="Camera off">📹❌</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canvas Snapshot Controls */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-1">Canvas Snapshots</p>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const collabRoomId = (window as any).currentRoomId;
              // Extract numeric room ID from "canvas-room-3" format
              const roomId = collabRoomId?.replace('canvas-room-', '') || collabRoomId;
              console.log('🔘 Restore button clicked, roomId:', roomId);
              window.dispatchEvent(new CustomEvent('collab:restore-latest', { detail: { roomId } }));
            }}
            className="flex-1 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm"
            title="Restore latest saved local snapshot"
          >
            ♻️ Restore Last
          </button>
          <button
            onClick={() => {
              try {
                const collabRoomId = (window as any).currentRoomId;
                // Extract numeric room ID from "canvas-room-3" format
                const roomId = collabRoomId?.replace('canvas-room-', '') || collabRoomId;
                console.log('🔘 Save button clicked, roomId:', roomId);
                const canvas = (window as any).fabricActiveCanvas as any;
                if (!canvas) {
                  console.warn('⚠️ No canvas found on window.fabricActiveCanvas');
                  return;
                }
                const state = canvas.toJSON(['_cid','createdBy','createdByName','createdByColor']);
                const key = `canvasSnapshots:${roomId}`;
                const existingRaw = localStorage.getItem(key);
                const existing = existingRaw ? JSON.parse(existingRaw) : [];
                existing.push({ timestamp: Date.now(), state });
                while (existing.length > 10) existing.shift();
                localStorage.setItem(key, JSON.stringify(existing));
                console.log(`💾 Manual snapshot saved for room ${roomId}. Total: ${existing.length}`, {
                  objectCount: state.objects?.length || 0,
                  timestamp: new Date().toLocaleTimeString()
                });
              } catch(err) { 
                console.error('❌ Failed manual snapshot:', err); 
              }
            }}
            className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
            title="Save a manual snapshot of current canvas"
          >
            💾 Save Snapshot
          </button>
        </div>
        <button
          onClick={() => {
            const collabRoomId = (window as any).currentRoomId;
            const roomId = collabRoomId?.replace('canvas-room-', '') || collabRoomId;
            console.log('🗑️ Clear canvas button clicked, roomId:', roomId);
            window.dispatchEvent(new CustomEvent('collab:clear-canvas', { detail: { roomId } }));
          }}
          className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm mt-2"
          title="Clear all objects from canvas"
        >
          🗑️ Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default RoomControls;