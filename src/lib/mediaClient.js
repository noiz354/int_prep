/**
 * Browser-safe media control-plane client (Phase 2).
 * Uses relative /api paths so Vite proxies to the local Express control plane;
 * never hard-codes a host. When the API is not running, returns local adapter
 * records so the demo UI keeps working.
 */
import { apiFetch } from './platformApi.js';

export const MEDIA_STATES = ['provisioning', 'ready', 'reconnecting', 'audio-only', 'ended'];

/** User-triggered device access (AGENTS: never auto-request). Stops tracks after use. */
export async function requestDeviceTracks() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Media devices are not available in this browser.');
  }
  return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } });
}

export async function stopDeviceTracks(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function localSession(interviewId) {
  return {
    id: `media-local-${interviewId}`,
    interviewId,
    region: 'ap-southeast-1',
    sfuCluster: 'local-adapter',
    status: 'ready',
    policy: {
      recording: 'tenant-default',
      rolePermissions: ['host-control', 'participant-media'],
      turn: { enabled: true, region: 'sg', credentialMode: 'ephemeral' },
      admission: 'host-gated',
      participantLimit: 12,
    },
    provider: 'local-adapter',
    providerState: 'blocked-on-provider-decision',
  };
}

export async function provisionMediaSession(interviewId, { region = 'ap-southeast-1', policy = {} } = {}) {
  const useApi = import.meta.env.VITE_USE_API === 'true';
  if (!useApi) return localSession(interviewId);
  const response = await apiFetch('/api/media/sessions', {
    method: 'POST',
    body: JSON.stringify({ interviewId, region, policy }),
  });
  return response.data;
}

export async function updateMediaState(sessionId, state, detail) {
  const useApi = import.meta.env.VITE_USE_API === 'true';
  if (!useApi) return { sessionId, status: state, connection: { state, detail } };
  const response = await apiFetch(`/api/media/sessions/${sessionId}/state`, {
    method: 'POST',
    body: JSON.stringify({ state, detail }),
  });
  return response.data;
}

export async function requestIceRestart(sessionId) {
  const useApi = import.meta.env.VITE_USE_API === 'true';
  if (!useApi) return { requestedAt: new Date().toISOString(), state: 'negotiating' };
  const response = await apiFetch(`/api/media/sessions/${sessionId}/ice-restart`, { method: 'POST' });
  return response.data;
}

export async function applyMediaEnhancement(sessionId, userId, preferences) {
  const useApi = import.meta.env.VITE_USE_API === 'true';
  if (!useApi) return { sessionId, userId, ...preferences, fallback: [], updatedAt: new Date().toISOString() };
  const response = await apiFetch('/api/media/enhancement', {
    method: 'POST',
    body: JSON.stringify({ sessionId, userId, preferences }),
  });
  return response.data;
}

export async function createWhiteboardSession(sessionId) {
  const useApi = import.meta.env.VITE_USE_API === 'true';
  if (!useApi) return { id: `wb-local-${sessionId}`, sessionId, permissions: ['host-control', 'participant-annotate'], screenShare: 'user-gesture-required', annotations: [], status: 'active' };
  const response = await apiFetch('/api/media/whiteboards', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  return response.data;
}

export async function annotateWhiteboard(whiteboardId, actorId, action, payload) {
  const useApi = import.meta.env.VITE_USE_API === 'true';
  if (!useApi) return { actorId, action, payload, at: new Date().toISOString() };
  const response = await apiFetch(`/api/media/whiteboards/${whiteboardId}/action`, {
    method: 'POST',
    body: JSON.stringify({ actorId, action, payload }),
  });
  return response.data;
}
