import { describe, expect, it, vi } from 'vitest';
import { shouldOffer, createConnectionRecovery, MAX_ICE_RESTARTS, ICE_RESTART_DELAY_MS } from './rtcMesh.js';

describe('rtc mesh offer collision rule', () => {
  it('picks exactly one of two peers to create the offer', () => {
    expect(shouldOffer('usr-alex', 'usr-maya')).toBe(true);
    expect(shouldOffer('usr-maya', 'usr-alex')).toBe(false);
    expect(shouldOffer('a', 'a')).toBe(false);
  });
});

describe('connection recovery state machine', () => {
  it('starts in connected state', () => {
    const recovery = createConnectionRecovery({});
    expect(recovery.state).toBe('connected');
    expect(recovery.restartCount).toBe(0);
  });

  it('schedules ICE restart and transitions to reconnecting', async () => {
    vi.useFakeTimers();
    const onStateChange = vi.fn();
    const setLocalDesc = vi.fn().mockResolvedValue(undefined);
    const createOffer = vi.fn().mockResolvedValue({});
    const pc = { setLocalDescription: setLocalDesc, createOffer };
    const recovery = createConnectionRecovery({ onStateChange });
    recovery.scheduleRestart(pc);
    expect(recovery.state).toBe('reconnecting');
    expect(onStateChange).toHaveBeenCalledWith('reconnecting', 0);
    await vi.advanceTimersByTimeAsync(ICE_RESTART_DELAY_MS);
    expect(pc.setLocalDescription).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('resets restart count on successful connection', () => {
    const onStateChange = vi.fn();
    const recovery = createConnectionRecovery({ onStateChange });
    recovery.scheduleRestart({});
    recovery.reset();
    expect(recovery.state).toBe('connected');
    expect(recovery.restartCount).toBe(0);
  });

  it('transitions to failed after max restart attempts', async () => {
    vi.useFakeTimers();
    const onStateChange = vi.fn();
    const pc = { setLocalDescription: vi.fn().mockResolvedValue(undefined), createOffer: vi.fn().mockResolvedValue({}) };
    const recovery = createConnectionRecovery({ onStateChange, maxRestarts: 2 });
    recovery.scheduleRestart(pc);
    await vi.advanceTimersByTimeAsync(ICE_RESTART_DELAY_MS);
    recovery.scheduleRestart(pc);
    await vi.advanceTimersByTimeAsync(ICE_RESTART_DELAY_MS);
    recovery.scheduleRestart(pc);
    expect(recovery.state).toBe('failed');
    vi.useRealTimers();
  });

  it('cancel clears pending restart', () => {
    vi.useFakeTimers();
    const recovery = createConnectionRecovery({ onStateChange: () => {} });
    recovery.scheduleRestart({});
    recovery.cancel();
    expect(recovery.state).toBe('reconnecting'); // state unchanged but timer cleared
    vi.useRealTimers();
  });
});
