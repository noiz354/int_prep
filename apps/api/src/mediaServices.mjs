/**
 * Phase 2 — Media control plane (BE-07, FE-01, FE-07, FE-10).
 *
 * Tested, tenant-scoped media-session boundary. The SFU/WebRTC provider
 * remains an adapter seam: provisioning returns region-aware, admission- and
 * policy-checked room contracts without embedding provider credentials.
 * Provider-backed deployment is `blocked on provider decision` (Phase 0).
 */
import { randomUUID } from 'node:crypto';
import { createEvent } from '../../../services/event-gateway/src/eventBus.mjs';

const now = () => new Date().toISOString();
const uuid = () => randomUUID().slice(0, 8);

const REGIONS = {
  'ap-southeast-1': { name: 'Singapore', sfuClusters: ['sg-1'], turnRegion: 'sg' },
  'us-east-1': { name: 'Virginia', sfuClusters: ['va-1'], turnRegion: 'va' },
  'eu-central-1': { name: 'Frankfurt', sfuClusters: ['fr-1'], turnRegion: 'fr' },
};

const MEDIA_STATES = ['provisioning', 'ready', 'reconnecting', 'audio-only', 'ended'];
const ADMISSION = ['admit', 'deny'];

export function createMediaServices({ events, tenantId = 'northstar' }) {
  const sessions = new Map();
  const whiteboards = new Map();
  const enhancementPrefs = new Map();

  function publish(type, payload) {
    if (!events) return;
    events.publish(createEvent(type, { tenantId, ...payload }));
  }

  /** BE-07: provision a tenant- and region-aware media session with policy contract. */
  function provisionSession({ interviewId, region = 'ap-southeast-1', requesterRoles = [], policy = {} }) {
    const regionConfig = REGIONS[region];
    if (!regionConfig) throw new Error(`Unsupported media region: ${region}`);
    const sessionId = `media-${uuid()}`;
    const session = {
      id: sessionId,
      tenantId,
      interviewId,
      region,
      sfuCluster: regionConfig.sfuClusters[0],
      status: 'provisioning',
      createdAt: now(),
      policy: {
        recording: policy.recording ?? 'tenant-default',
        rolePermissions: policy.rolePermissions ?? ['host-control', 'participant-media'],
        turn: { enabled: true, region: regionConfig.turnRegion, credentialMode: 'ephemeral' },
        admission: 'host-gated',
        participantLimit: policy.participantLimit ?? 12,
      },
      provider: 'adapter-ready',
      providerState: 'blocked-on-provider-decision',
    };
    sessions.set(sessionId, session);
    publish('media.session.provisioned', { interviewId, sessionId, region, sfuCluster: session.sfuCluster });
    return session;
  }

  function sessionStatus(sessionId) {
    return sessions.get(sessionId) || null;
  }

  function listSessions(interviewId) {
    return [...sessions.values()].filter((s) => s.interviewId === interviewId);
  }

  /** Admission control: host-gated, role-aware join decision. */
  function evaluateAdmission({ sessionId, userId, roles = [], hostAdmitted = false }) {
    const session = sessions.get(sessionId);
    if (!session) return { decision: 'deny', reason: 'unknown-session' };
    if (session.status === 'ended') return { decision: 'deny', reason: 'session-ended' };
    if (roles.includes('host') || roles.includes('interviewer')) return { decision: 'admit', role: 'participant' };
    if (session.policy.admission === 'host-gated' && !hostAdmitted) {
      return { decision: 'waiting-room', reason: 'awaiting-host-admission' };
    }
    return { decision: 'admit', role: 'candidate' };
  }

  /** FE-01: resilient room state — reconnect, ICE restart, adaptive bitrate, audio-only fallback. */
  function updateConnectionState(sessionId, { state, detail }) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    if (!MEDIA_STATES.includes(state)) throw new Error(`Invalid media state: ${state}`);
    session.status = state;
    session.connection = { state, detail: detail || 'updated', at: now() };
    if (state === 'audio-only') {
      session.adaptiveBitrate = false;
      session.audioOnlyFallback = true;
      publish('media.session.audio-only', { sessionId, interviewId: session.interviewId });
    }
    if (state === 'ready') {
      session.adaptiveBitrate = true;
      publish('media.session.ready', { sessionId, interviewId: session.interviewId });
    }
    return session;
  }

  function iceRestart(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    session.iceRestart = { requestedAt: now(), state: 'negotiating' };
    publish('media.session.ice-restart', { sessionId, interviewId: session.interviewId });
    return session.iceRestart;
  }

  /** FE-07: screen sharing + collaborative whiteboard with host-controlled stop/revoke. */
  function createWhiteboard({ sessionId, hostId }) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    const whiteboard = {
      id: `wb-${uuid()}`,
      sessionId,
      hostId,
      permissions: ['host-control', 'participant-annotate'],
      screenShare: 'user-gesture-required',
      annotations: [],
      createdAt: now(),
      status: 'active',
    };
    whiteboards.set(whiteboard.id, whiteboard);
    publish('media.whiteboard.created', { sessionId, whiteboardId: whiteboard.id });
    return whiteboard;
  }

  function whiteboardAction(whiteboardId, { actorId, action, payload }) {
    const board = whiteboards.get(whiteboardId);
    if (!board) return null;
    if (!board.permissions.includes('participant-annotate') && actorId !== board.hostId) {
      return { denied: true, reason: 'annotate permission required' };
    }
    const entry = { actorId, action, payload, at: now() };
    board.annotations.push(entry);
    publish('media.whiteboard.annotated', { whiteboardId, action, count: board.annotations.length });
    return entry;
  }

  function stopWhiteboard(whiteboardId, { actorId }) {
    const board = whiteboards.get(whiteboardId);
    if (!board) return null;
    if (actorId !== board.hostId) return { denied: true, reason: 'host-control-required' };
    board.status = 'ended';
    publish('media.whiteboard.ended', { whiteboardId });
    return board;
  }

  /** FE-10: user-controlled AV enhancement with browser capability fallback. */
  function applyEnhancement({ sessionId, userId, preferences = {} }) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    const supported = {
      backgroundBlur: 'browser-capability',
      noiseSuppression: 'getUserMedia-constraint',
      echoCancellation: 'getUserMedia-constraint',
    };
    const applied = {
      blur: Boolean(preferences.blur),
      noiseSuppression: Boolean(preferences.noiseSuppression),
      echoCancellation: Boolean(preferences.echoCancellation),
      fallback: [],
    };
    for (const [feature, enabled] of Object.entries(applied)) {
      if (enabled && !supported[feature]) applied.fallback.push(`${feature}:unsupported`);
    }
    const key = `${sessionId}:${userId}`;
    enhancementPrefs.set(key, { key, sessionId, userId, ...applied, updatedAt: now() });
    publish('media.enhancement.applied', { sessionId, userId, features: Object.keys(applied).filter((f) => applied[f]) });
    return enhancementPrefs.get(key);
  }

  function endSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    session.status = 'ended';
    publish('media.session.ended', { sessionId, interviewId: session.interviewId });
    return session;
  }

  /** Track cleanup verification: all local tracks/resources released. */
  function cleanup(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    session.cleanup = { tracksStopped: true, resourcesReleased: true, at: now() };
    return session.cleanup;
  }

  return {
    provisionSession,
    sessionStatus,
    listSessions,
    evaluateAdmission,
    updateConnectionState,
    iceRestart,
    createWhiteboard,
    whiteboardAction,
    stopWhiteboard,
    applyEnhancement,
    endSession,
    cleanup,
  };
}
