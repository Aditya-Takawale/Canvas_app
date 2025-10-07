import React, { useRef, useEffect } from 'react';
import { UseWebRTCReturn } from '../hooks/useWebRTC';

interface CallModalProps {
  webRTC: UseWebRTCReturn;
}

const CallModal: React.FC<CallModalProps> = ({ webRTC }) => {
  const {
    callState,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    isMuted,
    isVideoOff,
  } = webRTC;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Set up audio stream for voice calls
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      console.log('🔊 Setting up remote audio stream');
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => {
        console.error('Error playing remote audio:', e);
      });
    }
  }, [remoteStream]);

  // Don't render if no call activity
  if (!callState.isInCall && !callState.isInitiatingCall && !callState.isReceivingCall) {
    return null;
  }

  // Minimized call UI - floating compact widget
  if (callState.isMinimized && callState.isInCall) {
    return (
      <>
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 z-50 min-w-[250px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">
                {callState.callType === 'video' ? '📹' : '🎤'}
              </div>
              <div>
                <p className="font-semibold text-sm">{callState.remoteUserName}</p>
                {callState.isConnected && (
                  <p className="text-xs text-green-600 font-mono">
                    ⏱️ {webRTC.getFormattedDuration()}
                  </p>
                )}
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
            
            {callState.callType === 'video' && (
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
              onClick={endCall}
              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm"
              title="End Call"
            >
              📴
            </button>
          </div>
        </div>

        {/* Persistent audio element - always rendered for consistent audio */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-hidden">
        {/* Call Header */}
        <div className="bg-gray-100 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {callState.isReceivingCall && 'Incoming Call'}
                {callState.isInitiatingCall && 'Calling...'}
                {callState.isInCall && `${callState.callType === 'video' ? 'Video' : 'Voice'} Call`}
              </h3>
              <p className="text-sm text-gray-600">
                {callState.remoteUserName || 'Unknown User'}
              </p>
              {callState.isConnected && (
                <p className="text-sm text-green-600 font-mono">
                  ⏱️ {webRTC.getFormattedDuration()}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {callState.isInCall && (
                <button
                  onClick={toggleMinimize}
                  className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                  title="Minimize"
                >
                  ➖
                </button>
              )}
              <button
                onClick={endCall}
                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                title="End Call"
              >
                📴
              </button>
            </div>
          </div>
        </div>

        {/* Video Area */}
        {callState.callType === 'video' && (callState.isInCall || callState.isInitiatingCall) && (
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            {/* Remote Video (main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: remoteStream ? 'block' : 'none' }}
            />
            
            {/* Remote video placeholder */}
            {!remoteStream && callState.isInCall && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-4xl mb-2">👤</div>
                  <p>Waiting for {callState.remoteUserName}...</p>
                </div>
              </div>
            )}

            {/* Local Video (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: localStream && !isVideoOff ? 'block' : 'none' }}
              />
              {(!localStream || isVideoOff) && (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <span className="text-2xl">👤</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Call Area */}
        {callState.callType === 'voice' && (callState.isInCall || callState.isInitiatingCall) && (
          <div className="py-20 text-center bg-gradient-to-b from-blue-50 to-blue-100">
            <div className="text-6xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Voice Call with {callState.remoteUserName}
            </h3>
            <p className="text-gray-600 mb-2">
              {callState.isInCall ? 'Call in progress' : 'Connecting...'}
            </p>
            {callState.isConnected && (
              <p className="text-2xl font-mono text-green-600 font-semibold">
                ⏱️ {webRTC.getFormattedDuration()}
              </p>
            )}
          </div>
        )}

        {/* Incoming Call UI */}
        {callState.isReceivingCall && (
          <div className="py-16 text-center">
            <div className="text-6xl mb-4">
              {callState.callType === 'video' ? '📹' : '📞'}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Incoming {callState.callType} call
            </h3>
            <p className="text-gray-600 mb-8">
              {callState.remoteUserName} is calling you
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={rejectCall}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>❌</span>
                <span>Decline</span>
              </button>
              <button
                onClick={acceptCall}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>✅</span>
                <span>Accept</span>
              </button>
            </div>
          </div>
        )}

        {/* Call Controls */}
        {callState.isInCall && (
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
            
            {callState.callType === 'video' && (
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
              onClick={endCall}
              className="p-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="End Call"
            >
              📴
            </button>
          </div>
        )}

        {/* Hidden audio element for voice calls */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default CallModal;