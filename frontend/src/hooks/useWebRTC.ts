import { useState, useRef, useCallback, useEffect } from 'react';

interface BasicSocket {
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener?: (...args: any[]) => void) => void;
  id?: string;
  connected?: boolean;
}

export interface CallState {
  isInCall: boolean;
  isInitiatingCall: boolean;
  isReceivingCall: boolean;
  callType: 'voice' | 'video' | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isConnected: boolean;
  callDuration: number;
  isMinimized: boolean;
}

export interface UseWebRTCReturn {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetUserId: string, targetUserName: string, callType: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleMinimize: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  getFormattedDuration: () => string;
}

// STUN servers for NAT traversal (using free Google STUN servers)
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWebRTC = (socket: BasicSocket | null, roomId: number, userId: string): UseWebRTCReturn => {
  console.log('🔧 WebRTC hook initialized with socket:', !!socket, 'roomId:', roomId, 'userId:', userId);
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isInitiatingCall: false,
    isReceivingCall: false,
    callType: null,
    remoteUserId: null,
    remoteUserName: null,
    isConnected: false,
    callDuration: 0,
    isMinimized: false,
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);
  const callTimer = useRef<NodeJS.Timeout | null>(null);
  const callStartTime = useRef<number | null>(null);
  
  // Track socket changes
  useEffect(() => {
    console.log('🔄 WebRTC socket changed:', !!socket);
  }, [socket]);

  // Call timer effect
  useEffect(() => {
    if (callState.isConnected && !callTimer.current) {
      console.log('⏱️ Starting call timer');
      callStartTime.current = Date.now();
      callTimer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (callStartTime.current || 0)) / 1000);
        setCallState(prev => ({ ...prev, callDuration: elapsed }));
      }, 1000);
    } else if (!callState.isConnected && callTimer.current) {
      console.log('⏹️ Stopping call timer');
      clearInterval(callTimer.current);
      callTimer.current = null;
      callStartTime.current = null;
    }

    return () => {
      if (callTimer.current) {
        clearInterval(callTimer.current);
        callTimer.current = null;
      }
    };
  }, [callState.isConnected]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection({ iceServers });
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetUserId: callState.remoteUserId,
        });
      }
    };

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('📺 Received remote stream - call connected!');
      setRemoteStream(event.streams[0]);
      setCallState(prev => ({ ...prev, isConnected: true }));
    };

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('🔗 Connection state:', state);
      
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        endCall();
      }
    };

    return peerConnection.current;
  }, [socket, roomId, callState.remoteUserId]);

  // Start a call
  const startCall = useCallback(async (targetUserId: string, targetUserName: string, callType: 'voice' | 'video') => {
    try {
      console.log(`📞 Starting ${callType} call to ${targetUserName}`);
      
      setCallState(prev => ({
        ...prev,
        isInitiatingCall: true,
        callType,
        remoteUserId: targetUserId,
        remoteUserName: targetUserName,
      }));

      // Check permissions first for video calls
      if (callType === 'video') {
        try {
          const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permissions.state === 'denied') {
            throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
          }
        } catch (permError) {
          console.warn('Could not check camera permissions:', permError);
        }
      }

      // Get user media with better constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaError: any) {
        let errorMessage = 'Failed to access media devices.';
        
        if (mediaError.name === 'NotFoundError') {
          errorMessage = callType === 'video' 
            ? 'No camera found. Please connect a camera and try again.'
            : 'No microphone found. Please connect a microphone and try again.';
        } else if (mediaError.name === 'NotAllowedError') {
          errorMessage = callType === 'video'
            ? 'Camera access denied. Please allow camera access and try again.'
            : 'Microphone access denied. Please allow microphone access and try again.';
        } else if (mediaError.name === 'NotReadableError') {
          errorMessage = callType === 'video'
            ? 'Camera is being used by another application. Please close other applications and try again.'
            : 'Microphone is being used by another application. Please close other applications and try again.';
        }
        
        console.error('Media access error:', mediaError);
        alert(errorMessage);
        throw new Error(errorMessage);
      }

      setLocalStream(stream);

      // Initialize peer connection
      const pc = initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send call invitation
      if (socket) {
        console.log('📡 Sending call invitation via socket');
        console.log('📡 Call data:', { roomId, targetUserId, callType, currentUserId: userId });
        socket.emit('call-invite', {
          roomId,
          targetUserId,
          callType,
          offer,
        });
      } else {
        throw new Error('Socket not connected');
      }
    } catch (error) {
      console.error('❌ Error starting call:', error);
      setCallState(prev => ({ ...prev, isInitiatingCall: false }));
      
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Call failed: ${error.message}`);
      }
    }
  }, [socket, roomId, initializePeerConnection]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      console.log('✅ Accepting call');
      
      const constraints = {
        audio: true,
        video: callState.callType === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = initializePeerConnection();
      
      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      setCallState(prev => ({
        ...prev,
        isInCall: true,
        isReceivingCall: false,
      }));

      // Send acceptance
      if (socket) {
        socket.emit('call-accept', {
          roomId,
          targetUserId: callState.remoteUserId,
        });
      }
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      rejectCall();
    }
  }, [socket, roomId, callState.callType, callState.remoteUserId, initializePeerConnection]);

  // Reject call
  const rejectCall = useCallback(() => {
    console.log('❌ Rejecting call');
    
    if (socket) {
      socket.emit('call-reject', {
        roomId,
        targetUserId: callState.remoteUserId,
      });
    }

    setCallState({
      isInCall: false,
      isInitiatingCall: false,
      isReceivingCall: false,
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      isConnected: false,
      callDuration: 0,
      isMinimized: false,
    });
  }, [socket, roomId, callState.remoteUserId]);

  // End call
  const endCall = useCallback(() => {
    console.log('📴 Ending call');

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Stop remote stream
    setRemoteStream(null);

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Notify other user
    if (socket && callState.remoteUserId) {
      socket.emit('call-end', {
        roomId,
        targetUserId: callState.remoteUserId,
      });
    }

    setCallState({
      isInCall: false,
      isInitiatingCall: false,
      isReceivingCall: false,
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      isConnected: false,
      callDuration: 0,
      isMinimized: false,
    });

    setIsMuted(false);
    setIsVideoOff(false);
  }, [socket, roomId, localStream, callState.remoteUserId]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
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
      }
    }
  }, [localStream]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleCallInvite = (data: any) => {
      console.log('📞 Incoming call from:', data.callerName, 'Type:', data.callType);
      console.log('📞 Full call data:', data);
      setCallState(prev => ({
        ...prev,
        isReceivingCall: true,
        callType: data.callType,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName,
      }));
    };

    const handleCallAccept = async (data: any) => {
      console.log('✅ Call accepted, starting WebRTC negotiation');
      
      try {
        // Initialize peer connection and start offering process
        const pc = initializePeerConnection();
        
        // Add local stream to peer connection (it was created during startCall)
        if (localStream) {
          console.log('🎤 Adding local stream to peer connection');
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
          });
        } else {
          console.error('❌ No local stream available for call');
        }
        
        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket?.emit('offer', {
          roomId,
          targetUserId: callState.remoteUserId,
          offer,
        });
        
        // Update state to show call in progress
        setCallState(prev => ({ 
          ...prev, 
          isInCall: true, 
          isInitiatingCall: false 
        }));
        
        console.log('📞 WebRTC offer sent with local stream, call now in progress');
      } catch (error) {
        console.error('❌ Error starting WebRTC after call acceptance:', error);
        endCall();
      }
    };

    const handleCallReject = () => {
      console.log('❌ Call rejected');
      setCallState({
        isInCall: false,
        isInitiatingCall: false,
        isReceivingCall: false,
        callType: null,
        remoteUserId: null,
        remoteUserName: null,
        isConnected: false,
        callDuration: 0,
        isMinimized: false,
      });
    };

    const handleCallEnd = () => {
      console.log('📴 Call ended by remote user');
      endCall();
    };

    const handleOffer = async (data: any) => {
      console.log('📥 Received offer');
      const pc = initializePeerConnection();
      await pc.setRemoteDescription(data.offer);
      
      // Add pending ICE candidates
      pendingIceCandidates.current.forEach(candidate => {
        pc.addIceCandidate(candidate);
      });
      pendingIceCandidates.current = [];

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer', {
          roomId,
          targetUserId: data.callerId,
          answer,
        });
      }
    };

    const handleAnswer = async (data: any) => {
      console.log('📥 Received answer');
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(data.answer);
      }
    };

    const handleIceCandidate = async (data: any) => {
      console.log('🧊 Received ICE candidate');
      const candidate = new RTCIceCandidate(data.candidate);
      
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(candidate);
      } else {
        pendingIceCandidates.current.push(candidate);
      }
    };

    socket.on('call-invite', handleCallInvite);
    socket.on('call-accept', handleCallAccept);
    socket.on('call-reject', handleCallReject);
    socket.on('call-end', handleCallEnd);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('call-invite', handleCallInvite);
      socket.off('call-accept', handleCallAccept);
      socket.off('call-reject', handleCallReject);
      socket.off('call-end', handleCallEnd);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, roomId, initializePeerConnection, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // Toggle minimize/maximize call modal
  const toggleMinimize = useCallback(() => {
    setCallState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  }, []);

  // Format duration as MM:SS
  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(callState.callDuration / 60);
    const seconds = callState.callDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [callState.callDuration]);

  return {
    callState,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    isMuted,
    isVideoOff,
    getFormattedDuration,
  };
};