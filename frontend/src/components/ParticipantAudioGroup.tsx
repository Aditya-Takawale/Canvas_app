import React from 'react';
import ParticipantAudio from './ParticipantAudio';
import { RoomParticipant } from '../hooks/useWebRTCRoom';

interface ParticipantAudioGroupProps {
  participants: RoomParticipant[];
}

// Group component to render all audio elements without duplication
const ParticipantAudioGroup = React.memo<ParticipantAudioGroupProps>(({ participants }) => {
  console.log('🎵 ParticipantAudioGroup rendering with participants:', participants.length);
  
  participants.forEach((participant, index) => {
    console.log(`🎵 Participant ${index}:`, {
      userId: participant.userId,
      userName: participant.userName,
      hasStream: !!participant.stream,
      streamId: participant.stream?.id,
      audioTracks: participant.stream?.getAudioTracks().length || 0
    });
  });
  
  return (
    <>
      {participants.map((participant) => {
        if (participant.stream) {
          console.log('🎵 Creating ParticipantAudio for:', participant.userName, 'with stream:', participant.stream.id);
          return (
            <ParticipantAudio 
              key={participant.userId}
              stream={participant.stream}
              participantName={participant.userName}
            />
          );
        } else {
          console.log('⚠️ No stream for participant:', participant.userName);
          return null;
        }
      })}
    </>
  );
});

ParticipantAudioGroup.displayName = 'ParticipantAudioGroup';

export default ParticipantAudioGroup;