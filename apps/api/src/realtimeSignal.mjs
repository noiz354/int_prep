import { z } from 'zod';

export const SIGNAL_KINDS = ['webrtc.offer', 'webrtc.answer', 'webrtc.ice', 'whiteboard.stroke'];
export const MAX_SIGNAL_BYTES = 8192;

export const roomSignalSchema = z.object({
  interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/),
  kind: z.enum(SIGNAL_KINDS),
  payload: z.record(z.unknown()).optional(),
});

export function parseRoomSignal(raw) {
  const parsed = roomSignalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid signal' };
  const encoded = JSON.stringify(parsed.data.payload || {});
  if (encoded.length > MAX_SIGNAL_BYTES) return { ok: false, error: 'Signal too large' };
  return { ok: true, data: parsed.data };
}
