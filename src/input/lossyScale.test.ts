import { describe, expect, it } from 'vitest';

import { ConsolePreset } from '../signal/consolePreset';
import { VideoStandard } from '../signal/videoStandard';
import { lossyScale } from './lossyScale';

describe('lossyScale', () => {
  it.each([
    [768, 576, ConsolePreset.MasterSystem, 3],
    [1024, 768, ConsolePreset.MasterSystem, 4],
    [768, 576, ConsolePreset.GenesisH40, 3],
    [1000, 700, ConsolePreset.MasterSystem, 1]
  ])(
    'picks the scale that turns %sx%s into a size %s draws, or any console draws, or 1',
    (width, height, preset, expected) => {
      // Arrange
      const input = { width, height, preset, standard: VideoStandard.Ntsc };

      // Act
      const scale = lossyScale(input);

      // Assert
      expect(scale).toBe(expected);
    }
  );
});
