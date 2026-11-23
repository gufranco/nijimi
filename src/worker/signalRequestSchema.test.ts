import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { signalRequestSchema } from './signalRequestSchema';

const frame = { width: 2, height: 1, data: new Float32Array(6) };

describe('signalRequestSchema', () => {
  it('accepts a well-formed request', () => {
    // Arrange
    const request = { id: 3, frames: [frame], settings: DEFAULT_SETTINGS.signal };

    // Act
    const parsed = signalRequestSchema.safeParse(request);

    // Assert
    expect(parsed.success).toBe(true);
  });

  it('refuses a request with no frames', () => {
    // Arrange
    const request = { id: 3, frames: [], settings: DEFAULT_SETTINGS.signal };

    // Act
    const parsed = signalRequestSchema.safeParse(request);

    // Assert
    expect(parsed.success).toBe(false);
  });

  it('refuses a frame whose data does not match its size', () => {
    // Arrange
    const request = {
      id: 3,
      frames: [{ ...frame, data: new Float32Array(5) }],
      settings: DEFAULT_SETTINGS.signal
    };

    // Act
    const parsed = signalRequestSchema.safeParse(request);

    // Assert
    expect(parsed.success).toBe(false);
  });

  it('refuses an unknown connection', () => {
    // Arrange
    const request = {
      id: 3,
      frames: [frame],
      settings: { ...DEFAULT_SETTINGS.signal, connection: 'scart' }
    };

    // Act
    const parsed = signalRequestSchema.safeParse(request);

    // Assert
    expect(parsed.success).toBe(false);
  });
});
