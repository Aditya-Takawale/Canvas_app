import React, { useRef, useEffect } from 'react';

interface ParticipantAudioProps {
  stream: MediaStream;
  participantName: string;
}

// Single audio element component with stable ref management
const ParticipantAudio = React.memo<ParticipantAudioProps>(({ stream, participantName }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement && stream) {
      console.log('🔊 Setting audio stream for:', participantName, {
        streamId: stream.id,
        active: stream.active,
        audioTracks: stream.getAudioTracks().length
      });
      
      // Detailed stream analysis
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`🎵 Track ${index} for ${participantName}:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
      
      // Set the stream
      audioElement.srcObject = stream;
      audioElement.volume = 1.0;
      audioElement.muted = false;
      audioElement.defaultMuted = false;
      
      // Add comprehensive event listeners for debugging
      const handleLoadStart = () => console.log('🔄 Audio load started for:', participantName);
      const handleLoadedData = () => console.log('📊 Audio data loaded for:', participantName);
      const handleCanPlay = () => {
        console.log('🔊 Audio can play for:', participantName);
        // Check element state
        console.log('🎚️ Audio element state:', {
          paused: audioElement.paused,
          muted: audioElement.muted,
          volume: audioElement.volume,
          readyState: audioElement.readyState,
          networkState: audioElement.networkState
        });
      };
      const handlePlaying = () => console.log('▶️ Audio playing for:', participantName);
      const handlePause = () => console.log('⏸️ Audio paused for:', participantName);
      const handleEnded = () => console.log('🔚 Audio ended for:', participantName);
      const handleError = (e: Event) => {
        const error = (e.target as HTMLAudioElement).error;
        console.error('❌ Audio error for:', participantName, {
          code: error?.code,
          message: error?.message,
          event: e
        });
      };
      const handleStalled = () => console.warn('⚠️ Audio stalled for:', participantName);
      const handleWaiting = () => console.log('⏳ Audio waiting for:', participantName);
      const handleSuspend = () => console.log('💤 Audio suspended for:', participantName);

      // Add all event listeners
      audioElement.addEventListener('loadstart', handleLoadStart);
      audioElement.addEventListener('loadeddata', handleLoadedData);
      audioElement.addEventListener('canplay', handleCanPlay);
      audioElement.addEventListener('playing', handlePlaying);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);
      audioElement.addEventListener('error', handleError);
      audioElement.addEventListener('stalled', handleStalled);
      audioElement.addEventListener('waiting', handleWaiting);
      audioElement.addEventListener('suspend', handleSuspend);
      
      // Force play with comprehensive error handling
      const playAudio = async () => {
        try {
          console.log('🚀 Attempting to play audio for:', participantName);
          await audioElement.play();
          console.log('✅ Successfully started audio for:', participantName);
          
          // Monitor audio levels periodically
          const monitorAudio = () => {
            if (!audioElement.paused && !audioElement.muted) {
              console.log('🔊 Audio status for', participantName, ':', {
                currentTime: audioElement.currentTime,
                duration: audioElement.duration,
                volume: audioElement.volume,
                paused: audioElement.paused,
                streamActive: stream.active
              });
            }
          };
          
          // Check audio status every 5 seconds
          const monitor = setInterval(monitorAudio, 5000);
          
          // Clean up monitor
          return () => clearInterval(monitor);
        } catch (error: any) {
          console.error('❌ Failed to play audio for:', participantName, {
            name: error.name,
            message: error.message,
            code: error.code
          });
          
          if (error.name === 'NotAllowedError') {
            console.log('🚫 Autoplay blocked for:', participantName, '- user interaction required');
          }
        }
      };
      
      const stopMonitor = playAudio();
      
      // Cleanup function
      return () => {
        if (stopMonitor instanceof Promise) {
          stopMonitor.then(cleanup => cleanup && cleanup());
        }
        audioElement.removeEventListener('loadstart', handleLoadStart);
        audioElement.removeEventListener('loadeddata', handleLoadedData);
        audioElement.removeEventListener('canplay', handleCanPlay);
        audioElement.removeEventListener('playing', handlePlaying);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.removeEventListener('error', handleError);
        audioElement.removeEventListener('stalled', handleStalled);
        audioElement.removeEventListener('waiting', handleWaiting);
        audioElement.removeEventListener('suspend', handleSuspend);
      };
    }
  }, [stream, participantName]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
    />
  );
});

ParticipantAudio.displayName = 'ParticipantAudio';

export default ParticipantAudio;