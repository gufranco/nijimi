import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { handleSignalRequest } from './handleSignalRequest';

describe('handleSignalRequest', () => {
  it('renders a valid request and echoes its id', () => {
    // Arrange
    const request = {
      id: 7,
      frames: [{ width: 4, height: 2, data: new Float32Array(24).fill(0.5) }],
      settings: DEFAULT_SETTINGS.signal
    };

    // Act
    const response = handleSignalRequest(request);

    // Assert
    expect(response.id).toBe(7);
    expect(response.ok ? response.image.height : 0).toBe(2);
  });

  it('answers an invalid request with an error and the id it could read', () => {
    // Arrange
    const request = { id: 9, frames: [], settings: DEFAULT_SETTINGS.signal };

    // Act
    const response = handleSignalRequest(request);

    // Assert
    expect(response).toEqual({ id: 9, ok: false, message: 'invalid signal request' });
  });

  it('answers a message with no usable id with id -1', () => {
    // Arrange
    const request = 'not a request';

    // Act
    const response = handleSignalRequest(request);

    // Assert
    expect(response).toEqual({ id: -1, ok: false, message: 'invalid signal request' });
  });
});
