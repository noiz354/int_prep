import { describe, expect, it } from 'vitest';
import { shouldOffer } from './rtcMesh.js';

describe('rtc mesh offer collision rule', () => {
  it('picks exactly one of two peers to create the offer', () => {
    expect(shouldOffer('usr-alex', 'usr-maya')).toBe(true);
    expect(shouldOffer('usr-maya', 'usr-alex')).toBe(false);
    expect(shouldOffer('a', 'a')).toBe(false);
  });
});
