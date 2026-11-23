import { describe, expect, it } from 'vitest';

import { waitForEvent } from './waitForEvent';

describe('waitForEvent', () => {
  it('resolves when the event arrives and stops listening', async () => {
    // Arrange
    const target = new EventTarget();
    const waiting = waitForEvent({ target, name: 'seeked', timeoutMs: 1000 });

    // Act
    target.dispatchEvent(new Event('seeked'));

    // Assert
    await expect(waiting).resolves.toBeUndefined();
    target.dispatchEvent(new Event('error'));
  });

  it('rejects when an error event arrives first', async () => {
    // Arrange
    const target = new EventTarget();
    const waiting = waitForEvent({ target, name: 'seeked', timeoutMs: 1000 });

    // Act
    target.dispatchEvent(new Event('error'));

    // Assert
    await expect(waiting).rejects.toThrow('an error event arrived while waiting for seeked');
  });

  it('rejects when the event does not arrive in time', async () => {
    // Arrange
    const target = new EventTarget();

    // Act
    const waiting = waitForEvent({ target, name: 'loadeddata', timeoutMs: 5 });

    // Assert
    await expect(waiting).rejects.toThrow('loadeddata did not arrive within 5 ms');
  });
});
