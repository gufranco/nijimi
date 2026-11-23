import { describe, expect, it } from 'vitest';

import { createLogger } from './createLogger';

describe('createLogger', () => {
  it('reports an error carrying the message, the context and the cause', () => {
    // Arrange
    const reported: Error[] = [];
    const logger = createLogger((error) => {
      reported.splice(reported.length, 0, error);
    });
    const cause = new TypeError('bad bytes');

    // Act
    logger.error({ file: 'art.png', err: cause }, 'PNG decode failed');

    // Assert
    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toBe(
      'PNG decode failed {"file":"art.png","err":"TypeError: bad bytes"}'
    );
    expect(reported[0]?.cause).toBe(cause);
  });

  it('reports a context without a cause', () => {
    // Arrange
    const reported: Error[] = [];
    const logger = createLogger((error) => {
      reported.splice(reported.length, 0, error);
    });

    // Act
    logger.error({ step: 'render' }, 'worker failed');

    // Assert
    expect(reported[0]?.message).toBe('worker failed {"step":"render"}');
    expect(reported[0]?.cause).toBeUndefined();
  });
});
