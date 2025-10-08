import { useState, useRef, useCallback, useEffect } from 'react';
// Define a minimal socket interface to avoid constructor/value confusion
interface BasicSocket {
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener?: (...args: any[]) => void) => void;
  id?: string;
  connected?: boolean;
}

export interface RoomParticipant {
  userId: string;
  userName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  stream?: MediaStream;
}

export interface RoomState {
  isInAudioRoom: boolean;
  isInVideoRoom: boolean;
  participants: Map<string, RoomParticipant>;
  roomDuration: number;
  isMinimized: boolean;
}

export interface UseWebRTCRoomReturn {
  roomState: RoomState;
  localStream: MediaStream | null;
  joinAudioRoom: () => Promise<void>;
  joinVideoRoom: () => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleMinimize: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  getFormattedDuration: () => string;
}

// STUN servers for NAT traversal
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWebRTCRoom = (socket: BasicSocket | null, roomId: number, userId: string, userName: string): UseWebRTCRoomReturn => {
  // Helper to normalize any incoming ID to a canonical string form
  const normalizeId = useCallback((id: string | number) => String(id), []);
  // Only log initialization when socket actually changes
  const socketRef = useRef<BasicSocket | null>(null);
  
  useEffect(() => {
    if (socket !== socketRef.current) {
      console.log('🏠 WebRTC Room hook socket changed:', !!socket, 'roomId:', roomId, 'userId:', userId);
      socketRef.current = socket;
    }
  }, [socket, roomId, userId]);

  // Audio debugging helper function
  const testAudioPlayback = useCallback((stream: MediaStream, participantId: string) => {
    console.log('🧪 Testing audio playback for participant:', participantId);
    
    // Create a temporary audio element for testing
    const testAudio = document.createElement('audio');
    testAudio.autoplay = true;
    testAudio.controls = false;
    testAudio.muted = false;
    testAudio.volume = 1.0;
    testAudio.srcObject = stream;
    
    // Add debugging event listeners
    testAudio.onloadstart = () => console.log('🔄 Test audio loading started for:', participantId);
    testAudio.onloadeddata = () => console.log('📊 Test audio data loaded for:', participantId);
    testAudio.oncanplay = () => console.log('✅ Test audio can play for:', participantId);
    testAudio.onplay = () => console.log('▶️ Test audio started playing for:', participantId);
    testAudio.onpause = () => console.log('⏸️ Test audio paused for:', participantId);
    testAudio.onerror = (e) => console.error('❌ Test audio error for:', participantId, e);
    testAudio.onstalled = () => console.warn('⚠️ Test audio stalled for:', participantId);
    testAudio.onwaiting = () => console.log('⏳ Test audio waiting for:', participantId);
    
    // Check browser autoplay policy
    const playPromise = testAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✅ Test audio autoplay succeeded for:', participantId);
          // Clean up test element after successful test
          setTimeout(() => {
            testAudio.srcObject = null;
            testAudio.remove();
          }, 1000);
        })
        .catch((error) => {
          console.error('❌ Test audio autoplay failed for:', participantId, {
            name: error.name,
            message: error.message,
            code: error.code
          });
          
          // Try to play with user interaction (this is just for debugging)
          console.log('💡 Autoplay blocked - this is likely the issue. Audio needs user interaction.');
        });
    }
    
    // Log current audio context state
    if (typeof window !== 'undefined' && 'webkitAudioContext' in window || 'AudioContext' in window) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        console.log('🎚️ Audio context state:', audioContext.state);
        audioContext.close();
      } catch (e) {
        console.log('🔇 Could not create audio context:', e);
      }
    }
  }, []);
  
  const [roomState, setRoomState] = useState<RoomState>({
    isInAudioRoom: false,
    isInVideoRoom: false,
    participants: new Map(),
    roomDuration: 0,
    isMinimized: false,
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Multiple peer connections - one per participant
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Queue ICE candidates until remote description is set
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  // Track stats intervals so we can clean them up
  const statsIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Cache previous inbound stats to show deltas
  const prevInboundStats = useRef<Map<string, { packets: number; bytes: number }>>(new Map());
  const roomTimer = useRef<NodeJS.Timeout | null>(null);
  const roomStartTime = useRef<number | null>(null);

  // Initialize peer connection for a specific participant
  const createPeerConnection = useCallback((rawId: string) => {
    const participantId = normalizeId(rawId);
    if (peerConnections.current.has(participantId)) {
      console.log('♻️ Reusing existing peer connection for participant:', participantId);
      return peerConnections.current.get(participantId)!;
    }
    console.log('🔗 Creating peer connection for participant:', participantId);
    
    const pc = new RTCPeerConnection({ iceServers });
    
    // Initialize ICE candidate queue for this participant
    iceCandidateQueues.current.set(participantId, []);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetUserId: participantId,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📺 Received remote stream from:', participantId);
      const stream = event.streams[0];
      
      // Comprehensive audio debugging
      console.log('🔍 Stream analysis for participant:', participantId, {
        streamId: stream.id,
        active: stream.active,
        totalTracks: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      // Check each audio track in detail
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`🎵 Audio track ${index} for ${participantId}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings ? track.getSettings() : 'getSettings not available'
        });
        
        // Listen for track state changes
        track.onended = () => console.log(`🔚 Audio track ${index} ended for ${participantId}`);
        track.onmute = () => console.log(`🔇 Audio track ${index} muted for ${participantId}`);
        track.onunmute = () => console.log(`🔊 Audio track ${index} unmuted for ${participantId}`);
      });
      
      setRoomState(prev => {
        const newParticipants = new Map(prev.participants);
        // Ensure consistent string conversion for participant ID
  const stringParticipantId = normalizeId(participantId);
  const participant = newParticipants.get(stringParticipantId);
        
        console.log('🔄 Before stream assignment for', stringParticipantId, ':', {
          participantExists: !!participant,
          participantData: participant,
          streamId: stream.id,
          totalParticipants: newParticipants.size,
          allParticipantIds: Array.from(newParticipants.keys())
        });
        
        if (participant) {
          participant.stream = stream;
          newParticipants.set(stringParticipantId, participant);
          console.log('✅ Stream assigned to participant', stringParticipantId, ':', {
            streamId: stream.id,
            hasStream: !!participant.stream,
            participantName: participant.userName
          });
        } else {
          console.warn('⚠️ Participant not found when trying to assign stream:', stringParticipantId);
          // Create the participant if they don't exist
          const newParticipant = {
            userId: stringParticipantId,
            userName: `User${stringParticipantId}`, // Fallback name
            isMuted: false,
            isVideoOff: false,
            stream: stream
          };
          newParticipants.set(stringParticipantId, newParticipant);
          console.log('🆕 Created new participant with stream:', newParticipant);
        }
        
        const updatedState = { ...prev, participants: newParticipants };
        console.log('📝 Updated room state with stream:', {
          totalParticipants: updatedState.participants.size,
          participantWithStream: Array.from(updatedState.participants.values()).find(p => p.userId === stringParticipantId)?.stream?.id
        });
        
        return updatedState;
      });
      
      // Test audio playback immediately
      if (stream.getAudioTracks().length > 0) {
        console.log('🎵 Audio track detected for:', participantId);
        setTimeout(() => {
          console.log('🔍 Testing immediate audio element creation for:', participantId);
          testAudioPlayback(stream, participantId);
        }, 100);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('🔗 Connection state with', participantId, ':', state);
      
      // Add detailed connection diagnostics
      if (state === 'connected') {
        console.log('✅ WebRTC connection established with:', participantId);
        // Get connection stats for debugging
        setTimeout(() => {
          pc.getStats().then(stats => {
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                console.log('🌐 Active connection path for', participantId, ':', {
                  type: report.type,
                  state: report.state,
                  localCandidateType: report.localCandidateType,
                  remoteCandidateType: report.remoteCandidateType,
                  transportType: report.currentRoundTripTime ? 'Direct P2P' : 'Unknown'
                });
              }
              if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
                console.log('📊 Audio reception stats for', participantId, ':', {
                  packetsReceived: report.packetsReceived,
                  bytesReceived: report.bytesReceived,
                  audioLevel: report.audioLevel,
                  totalAudioEnergy: report.totalAudioEnergy
                });
              }
            });
          }).catch(e => console.log('📊 Could not get connection stats:', e));
        }, 1000);
      }
      
      if (state === 'connected') {
        // Start periodic stats polling for inbound audio once connected
        if (!statsIntervals.current.has(participantId)) {
          const interval = setInterval(async () => {
            try {
              const pcRef = peerConnections.current.get(participantId);
              if (!pcRef) return;
              const stats = await pcRef.getStats();
              stats.forEach(report => {
                if (report.type === 'inbound-rtp' && (report as any).mediaType === 'audio') {
                  const packets = (report as any).packetsReceived || 0;
                  const bytes = (report as any).bytesReceived || 0;
                  const audioLevel = (report as any).audioLevel;
                  const prev = prevInboundStats.current.get(participantId);
                  const deltaPackets = prev ? packets - prev.packets : packets;
                  const deltaBytes = prev ? bytes - prev.bytes : bytes;
                  if (!prev || deltaPackets > 0) {
                    console.log('📡 Inbound audio stats', participantId, {
                      totalPackets: packets,
                      deltaPackets,
                      totalBytes: bytes,
                      deltaBytes,
                      audioLevel,
                      timestamp: new Date().toISOString()
                    });
                  }
                  prevInboundStats.current.set(participantId, { packets, bytes });
                }
              });
            } catch (e) {
              console.warn('⚠️ Error polling stats for', participantId, e);
            }
          }, 3000);
          statsIntervals.current.set(participantId, interval);
        }
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        // Remove participant on disconnect
        setRoomState(prev => {
          const newParticipants = new Map(prev.participants);
          newParticipants.delete(participantId);
          return { ...prev, participants: newParticipants };
        });
        peerConnections.current.delete(participantId);
        iceCandidateQueues.current.delete(participantId);
        const intv = statsIntervals.current.get(participantId);
        if (intv) {
          clearInterval(intv);
          statsIntervals.current.delete(participantId);
        }
        prevInboundStats.current.delete(participantId);
      }
    };

    // Additional ICE level diagnostics
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state', participantId, pc.iceConnectionState);
    };

    // Add local stream if available
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    peerConnections.current.set(participantId, pc);
    return pc;
  }, [socket, roomId, localStream, normalizeId]);

  // Process queued ICE candidates after remote description is set
  const processQueuedIceCandidates = useCallback(async (rawId: string) => {
    const participantId = normalizeId(rawId);
    const pc = peerConnections.current.get(participantId);
    const queue = iceCandidateQueues.current.get(participantId);
    
    if (pc && queue && pc.remoteDescription) {
      console.log(`🧊 Processing ${queue.length} queued ICE candidates for:`, participantId);
      
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(candidate);
          console.log('✅ Added queued ICE candidate for:', participantId);
        } catch (error) {
          console.error('❌ Error adding queued ICE candidate:', error);
        }
      }
      
      // Clear the queue
      iceCandidateQueues.current.set(participantId, []);
    }
  }, [normalizeId]);

  // Create and send offer to a participant
  const createOffer = useCallback(async (rawId: string) => {
    try {
      const participantId = normalizeId(rawId);
      console.log('📤 Creating offer for participant:', participantId);
      const pc = peerConnections.current.get(participantId) || createPeerConnection(participantId);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('webrtc-offer', {
          roomId,
          offer,
          targetUserId: participantId,
        });
      }
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  }, [socket, roomId, createPeerConnection, normalizeId]);

  // Common room joining logic
  const joinRoom = useCallback(async (isJoiningVideo: boolean) => {
    console.log('🎯 joinRoom function called with isJoiningVideo:', isJoiningVideo);
    console.log('🔍 Current room state before join:', {
      isInAudioRoom: roomState.isInAudioRoom,
      isInVideoRoom: roomState.isInVideoRoom,
      hasLocalStream: !!localStream,
      socketConnected: socket?.connected
    });
    
    try {
      console.log(isJoiningVideo ? '📹 Joining video room' : '🎤 Joining audio room');
      
      // Media constraints for audio (always the same) + initial video constraint
      const baseAudio: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      const attemptVideoAcquisition = async (): Promise<MediaStream> => {
        // If not joining video, simple one-step
        if (!isJoiningVideo) {
          const audioOnlyConstraints: MediaStreamConstraints = { audio: baseAudio, video: false };
          console.log('📱 Requesting audio-only media access:', audioOnlyConstraints);
          return navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
        }

        // Progressive fallback list for video
        const videoConstraintVariants: MediaTrackConstraints[] = [
          { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } },
          { width: 640, height: 360 },
          { width: 320, height: 240 },
          {} // Let browser pick anything
        ];

        let lastError: any = null;
        for (let i = 0; i < videoConstraintVariants.length; i++) {
          const video = videoConstraintVariants[i];
            const constraints: MediaStreamConstraints = { audio: baseAudio, video };
            console.log(`📱 Attempting getUserMedia (variant ${i + 1}/${videoConstraintVariants.length}):`, constraints);
            try {
              const stream = await navigator.mediaDevices.getUserMedia(constraints);
              console.log('✅ Acquired media with variant', i + 1);
              return stream;
            } catch (err: any) {
              lastError = err;
              console.warn('⚠️ getUserMedia failed for variant', i + 1, err.name, err.message);
              // If NotReadableError or OverConstrainedError, continue fallback
              if (err.name === 'NotReadableError' || err.name === 'OverconstrainedError' || err.name === 'OverConstrainedError') {
                continue; // try next
              } else if (err.name === 'NotAllowedError') {
                // Permission denied stops further attempts
                throw err;
              } else {
                // Other errors: continue to next, but still attempt
                continue;
              }
            }
        }
        // Exhausted variants
        if (lastError) throw lastError;
        throw new Error('Unknown media acquisition failure');
      };

      // If we are joining video and a NotReadableError occurs, we will enumerate devices for diagnostics
      let stream: MediaStream;
      try {
        stream = await attemptVideoAcquisition();
      } catch (err: any) {
        if (isJoiningVideo && err.name === 'NotReadableError') {
          console.error('❌ NotReadableError on initial attempts. Enumerating devices for diagnostics...');
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            console.log('🧪 Available media devices snapshot:', devices.map(d => ({ kind: d.kind, label: d.label, deviceId: d.deviceId })));            
          } catch (enumErr) {
            console.warn('⚠️ Could not enumerate devices:', enumErr);
          }
          // Provide user guidance
          alert('Could not start video source (camera busy or in use by another application). Please close other apps using the camera (Zoom, Teams, browser tabs) and try again. We will continue with audio only.');
          // Fallback to audio only so user still joins
          const audioOnlyConstraints: MediaStreamConstraints = { audio: baseAudio, video: false };
          stream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
          isJoiningVideo = false; // Downgrade session type
        } else {
          throw err; // propagate for generic handler below
        }
      }

      console.log('✅ Media stream obtained:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      console.log('✅ Media stream obtained:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      
      setLocalStream(stream);
      console.log('📝 Local stream set, updating room state...');

      // Update room state
      setRoomState(prev => ({
        ...prev,
        isInAudioRoom: !isJoiningVideo,
        isInVideoRoom: isJoiningVideo,
      }));
      console.log('📝 Room state updated:', { isInAudioRoom: !isJoiningVideo, isInVideoRoom: isJoiningVideo });

      // Start timer
      roomStartTime.current = Date.now();
      roomTimer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (roomStartTime.current || 0)) / 1000);
        setRoomState(prev => ({ ...prev, roomDuration: elapsed }));
      }, 1000);

      // Notify server
      if (socket?.connected) {
        console.log('📡 Notifying server about room join');
        socket.emit('join-webrtc-room', {
          roomId,
          roomType: isJoiningVideo ? 'video' : 'audio',
          userId,
          userName,
        });
      } else {
        console.warn('⚠️ Socket not connected. Details:', {
          hasSocket: !!socket,
          socketId: socket?.id,
          connected: socket?.connected,
          socketReadyState: socket ? 'socket exists' : 'no socket'
        });
        
        // Try to emit anyway if socket exists but connected property is unclear
        if (socket) {
          console.log('🔄 Attempting to emit anyway since socket exists...');
          socket.emit('join-webrtc-room', {
            roomId,
            roomType: isJoiningVideo ? 'video' : 'audio',
            userId,
            userName,
          });
        }
      }

    } catch (error) {
      console.error(`❌ Error joining ${isJoiningVideo ? 'video' : 'audio'} room:`, error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Don't show alert for permission denied - user might have cancelled
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('🚫 User denied media access');
        alert('Microphone access was denied. Please allow microphone access and try again.');
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        console.log('🔍 No media devices found');
        alert('No microphone found. Please check your audio devices.');
      } else {
        // Provide more tailored guidance for video acquisition issues
        if (isJoiningVideo && error instanceof Error && error.name === 'NotReadableError') {
          alert('Unable to start your camera (NotReadableError). This often means another application is locking it. Close other video apps or browser tabs, then retry.');
        } else if (isJoiningVideo && error instanceof Error && error.name === 'NotFoundError') {
          alert('No camera device found. Connect a camera or disable video to join with audio only.');
        } else {
          alert(`Failed to access ${isJoiningVideo ? 'camera/microphone' : 'microphone'}. Please check permissions. Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Clean up any partial state
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      // Reset room state
      setRoomState(prev => ({
        ...prev,
        isInAudioRoom: false,
        isInVideoRoom: false,
      }));
      
      // Re-throw error so caller knows it failed
      throw error;
    }
  }, [socket, roomId, userId, userName]);

  // Join audio room
  const joinAudioRoom = useCallback(async () => {
    console.log('🚀 joinAudioRoom called - starting process...');
    try {
      const result = await joinRoom(false);
      console.log('✅ joinAudioRoom completed successfully');
      return result;
    } catch (error) {
      console.error('❌ joinAudioRoom failed:', error);
      throw error;
    }
  }, [joinRoom]);

  // Join video room
  const joinVideoRoom = useCallback(async () => {
    console.log('🚀 joinVideoRoom called - starting process...');
    try {
      const result = await joinRoom(true);
      console.log('✅ joinVideoRoom completed successfully');
      return result;
    } catch (error) {
      console.error('❌ joinVideoRoom failed:', error);
      throw error;
    }
  }, [joinRoom]);

  // Leave room
  const leaveRoom = useCallback(() => {
    console.log('🚪 Leaving WebRTC room - called from:', new Error().stack?.split('\n')[2]?.trim());

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    iceCandidateQueues.current.clear();

    // Stop timer
    if (roomTimer.current) {
      clearInterval(roomTimer.current);
      roomTimer.current = null;
      roomStartTime.current = null;
    }

    // Reset state
    setRoomState({
      isInAudioRoom: false,
      isInVideoRoom: false,
      participants: new Map(),
      roomDuration: 0,
      isMinimized: false,
    });

    setIsMuted(false);
    setIsVideoOff(false);

    // Notify server
    if (socket?.connected) {
      socket.emit('leave-webrtc-room', { roomId, userId });
    }
  }, [socket, roomId, userId, localStream]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('🎤', audioTrack.enabled ? 'Unmuted' : 'Muted');
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log('📹', videoTrack.enabled ? 'Video on' : 'Video off');
      }
    }
  }, [localStream]);

  // Toggle minimize
  const toggleMinimize = useCallback(() => {
    setRoomState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  }, []);

  // Format duration as MM:SS
  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(roomState.roomDuration / 60);
    const seconds = roomState.roomDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [roomState.roomDuration]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleParticipantJoined = (data: any) => {
      console.log('👋 Participant joined:', data.userName, 'with ID:', data.userId, 'type:', typeof data.userId);
      setRoomState(prev => {
        const newParticipants = new Map(prev.participants);
        // Ensure userId is always a string for consistent key handling
        const participantId = String(data.userId);
        newParticipants.set(participantId, {
          userId: participantId,
          userName: data.userName,
          isMuted: false,
          isVideoOff: false,
        });
        console.log('✅ Added participant to state:', participantId, 'total participants:', newParticipants.size);
        return { ...prev, participants: newParticipants };
      });

      // Create peer connection and offer for new participant
  const participantId = normalizeId(data.userId);
      createPeerConnection(participantId);
      // Automatically create offer to new participant with minimal delay
      setTimeout(() => {
        console.log('🎯 Creating offer to new participant:', participantId);
        createOffer(participantId);
      }, 500);
    };

    const handleRoomParticipants = (data: any) => {
      console.log('👥 Received current participants:', data.participants);
      
      // Add all existing participants and create offers to them
      data.participants.forEach((participant: any, index: number) => {
  const participantId = normalizeId(participant.userId); // Ensure consistent string type
        console.log('➕ Adding existing participant:', participantId, 'name:', participant.userName);
        
        setRoomState(prev => {
          const newParticipants = new Map(prev.participants);
          newParticipants.set(participantId, {
            userId: participantId,
            userName: participant.userName,
            isMuted: false,
            isVideoOff: false,
          });
          return { ...prev, participants: newParticipants };
        });
        
        // Create peer connection and offer to existing participant
        createPeerConnection(participantId);
        // Reduce stagger time for faster connections
        setTimeout(() => {
          console.log('🎯 Creating offer to existing participant:', participantId);
          createOffer(participantId);
        }, 500 + (index * 300));
      });
    };

    const handleParticipantLeft = (data: any) => {
  const participantId = normalizeId(data.userId); // Ensure consistent string type
      console.log('👋 Participant left:', data.userName, 'ID:', participantId);
      setRoomState(prev => {
        const newParticipants = new Map(prev.participants);
        newParticipants.delete(participantId);
        console.log('🗑️ Removed participant from state:', participantId, 'remaining:', newParticipants.size);
        return { ...prev, participants: newParticipants };
      });

      // Close peer connection
      const pc = peerConnections.current.get(participantId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(participantId);
        iceCandidateQueues.current.delete(participantId);
      }
    };

    const handleWebRTCOffer = async (data: any) => {
      try {
  const fromId = normalizeId(data.fromUserId);
  console.log('📥 Received WebRTC offer from:', fromId);
  const pc = peerConnections.current.get(fromId) || createPeerConnection(fromId);
        
        console.log('🔄 Setting remote description...');
        await pc.setRemoteDescription(data.offer);
        
        // Process any queued ICE candidates now that remote description is set
  await processQueuedIceCandidates(fromId);
        
        console.log('🔄 Creating answer...');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log('📤 Sending answer to:', data.fromUserId);
        socket.emit('webrtc-answer', {
          roomId,
          answer,
          targetUserId: fromId,
        });
      } catch (error) {
        console.error('❌ Error handling WebRTC offer:', error);
      }
    };

    const handleWebRTCAnswer = async (data: any) => {
      try {
        const fromId = normalizeId(data.fromUserId);
        console.log('📥 Received WebRTC answer from:', fromId);
        const pc = peerConnections.current.get(fromId);
        if (pc) {
          console.log('🔄 Setting remote description for answer...');
          await pc.setRemoteDescription(data.answer);
          
          // Process any queued ICE candidates now that remote description is set
          await processQueuedIceCandidates(fromId);
          
          console.log('✅ WebRTC connection should be established with:', fromId);
        } else {
          console.warn('⚠️ No peer connection found for answer from:', fromId);
        }
      } catch (error) {
        console.error('❌ Error handling WebRTC answer:', error);
      }
    };

    const handleWebRTCIceCandidate = async (data: any) => {
      try {
        const fromId = normalizeId(data.fromUserId);
        console.log('📥 Received ICE candidate from:', fromId);
        const pc = peerConnections.current.get(fromId);
        
        if (pc) {
          if (pc.remoteDescription) {
            // Remote description is set, add candidate immediately
            await pc.addIceCandidate(data.candidate);
            console.log('✅ Added ICE candidate for:', fromId);
          } else {
            // Queue the candidate until remote description is set
            const queue = iceCandidateQueues.current.get(fromId) || [];
            queue.push(data.candidate);
            iceCandidateQueues.current.set(fromId, queue);
            console.log('🧊 Queued ICE candidate for:', fromId, `(queue size: ${queue.length})`);
          }
        } else {
          console.warn('⚠️ No peer connection found for ICE candidate from:', fromId);
        }
      } catch (error) {
        console.error('❌ Error handling ICE candidate:', error);
      }
    };

    socket.on('participant-joined-webrtc', handleParticipantJoined);
    socket.on('participant-left-webrtc', handleParticipantLeft);
    socket.on('webrtc-room-participants', handleRoomParticipants);
    socket.on('webrtc-offer', handleWebRTCOffer);
    socket.on('webrtc-answer', handleWebRTCAnswer);
    socket.on('webrtc-ice-candidate', handleWebRTCIceCandidate);

    return () => {
      socket.off('participant-joined-webrtc', handleParticipantJoined);
      socket.off('participant-left-webrtc', handleParticipantLeft);
      socket.off('webrtc-room-participants', handleRoomParticipants);
      socket.off('webrtc-offer', handleWebRTCOffer);
      socket.off('webrtc-answer', handleWebRTCAnswer);
      socket.off('webrtc-ice-candidate', handleWebRTCIceCandidate);
    };
  }, [socket, roomId, createPeerConnection, createOffer, processQueuedIceCandidates, normalizeId]);

  // Cleanup on unmount only - use ref to avoid dependency issues
  const leaveRoomRef = useRef(leaveRoom);
  leaveRoomRef.current = leaveRoom;
  
  useEffect(() => {
    return () => {
      // Use ref to get the latest leaveRoom function without adding it as dependency
      leaveRoomRef.current();
    };
  }, []); // Empty dependency array - only run on unmount

  // Add local stream to existing peer connections when it becomes available
  useEffect(() => {
    if (localStream) {
      console.log('🎤 Adding local stream to existing peer connections');
      
      // Guard to prevent race condition: only re-negotiate if we already have established connections
      const isInitialSetup = peerConnections.current.size === 0;
      
      peerConnections.current.forEach((pc, participantId) => {
        // Remove old tracks
        pc.getSenders().forEach(sender => {
          if (sender.track) {
            pc.removeTrack(sender);
          }
        });
        
        // Add new tracks
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
        
        console.log('✅ Added local stream to peer connection with:', participantId);
      });
      
      // Only create offers for re-negotiation, not initial setup
      // Initial offers are handled by socket event handlers
      if (!isInitialSetup && peerConnections.current.size > 0) {
        console.log('🔄 Re-negotiating: Creating offers after stream update');
        setTimeout(() => {
          peerConnections.current.forEach((pc, participantId) => {
            console.log('🎯 Re-sending offer to:', participantId);
            createOffer(participantId);
          });
        }, 300);
      } else {
        console.log('⏭️ Skipping offer creation - initial setup or no connections');
      }
    }
  }, [localStream, createOffer]);

  return {
    roomState,
    localStream,
    joinAudioRoom,
    joinVideoRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    isMuted,
    isVideoOff,
    getFormattedDuration,
  };
};