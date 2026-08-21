import { io } from 'socket.io-client';
import { getDemoSession, isRemoteApiEnabled } from './session.js';

/** Uses a relative path so the browser never needs a localhost URL. */
export async function connectInterviewRoom(interviewId, handlers = {}) {
  if (!isRemoteApiEnabled()) return { mode: 'local', disconnect: () => {}, sendAction: () => {} };
  const session = await getDemoSession();
  const socket = io({
    path: '/socket.io',
    auth: { token: session.accessToken },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 4,
    timeout: 7000,
  });

  socket.on('connect', () => {
    handlers.onStatus?.({ state: 'connected', label: 'Realtime room connected' });
    socket.emit('room.join', { interviewId }, (result) => {
      if (result?.ok) handlers.onPresence?.(result.participants);
      else handlers.onStatus?.({ state: 'error', label: result?.error || 'Room join failed' });
    });
  });
  socket.on('presence.updated', ({ participants }) => handlers.onPresence?.(participants));
  socket.on('room.action', (event) => handlers.onRoomAction?.(event));
  socket.on('disconnect', () => handlers.onStatus?.({ state: 'disconnected', label: 'Realtime room reconnecting' }));
  socket.on('connect_error', () => handlers.onStatus?.({ state: 'error', label: 'Realtime fallback active' }));

  return {
    mode: 'remote',
    disconnect: () => socket.disconnect(),
    sendAction: (action, value) => socket.emit('room.action', { interviewId, action, value }),
  };
}
