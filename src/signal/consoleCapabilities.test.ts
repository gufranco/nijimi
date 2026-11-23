import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CONSOLE_CAPABILITIES } from './consoleCapabilities';
import { ConsolePreset } from './consolePreset';
import { SpecialMode } from './specialMode';

const REFERENCE = readFileSync(new URL('../../REFERENCE.md', import.meta.url), 'utf8');
const LISTED = Object.values(ConsolePreset).filter((preset) => preset !== ConsolePreset.Custom);

describe('CONSOLE_CAPABILITIES', () => {
  it('describes every listed console preset and nothing else', () => {
    // Arrange
    const expected = [...LISTED].toSorted();

    // Act
    const keys = Object.keys(CONSOLE_CAPABILITIES).toSorted();

    // Assert
    expect(keys).toEqual(expected);
  });

  it.each(LISTED)('has a sourced row for %s in the REFERENCE.md console modes table', (preset) => {
    // Arrange
    const row = new RegExp(`^\\| \`${preset}\` +\\|`, 'm');

    // Act
    const documented = row.test(REFERENCE);

    // Assert
    expect(documented).toBe(true);
  });

  it('allows 25 NES colors: a backdrop plus 3 opaque entries in each of 4 background and 4 sprite palettes', () => {
    // Arrange
    const palettes = 4 + 4;

    // Act
    const limit = CONSOLE_CAPABILITIES[ConsolePreset.Nes].colors.ntsc[0].limit;

    // Assert
    expect(limit).toBe(1 + palettes * 3);
  });

  it('allows 61 Genesis colors from 4 palettes of 16 with a shared transparent entry, 3 times that with shadow/highlight', () => {
    // Arrange
    const base = 4 * 15 + 1;

    // Act
    const tiers = CONSOLE_CAPABILITIES[ConsolePreset.GenesisH40].colors.pal;

    // Assert
    expect(tiers).toEqual([
      { limit: base, needs: null },
      { limit: 3 * base, needs: SpecialMode.ShadowHighlight }
    ]);
  });

  it('gives each channel 2 bits on the Master System, 3 on the Genesis and 5 on the SNES and PlayStation', () => {
    // Arrange
    const presets = [
      ConsolePreset.MasterSystem,
      ConsolePreset.GenesisH32,
      ConsolePreset.Snes256,
      ConsolePreset.Ps1W320
    ] as const;

    // Act
    const levels = presets.map((preset) => CONSOLE_CAPABILITIES[preset].levels?.[0].limit);

    // Assert
    expect(levels).toEqual([2 ** 2, 2 ** 3, 2 ** 5, 2 ** 5]);
  });

  it('reaches 15 levels per channel under shadow/highlight: 8 normal, 8 halved, 8 halved plus half', () => {
    // Arrange
    const normal = Array.from({ length: 8 }, (_, step) => step * 2);
    const levels = new Set([
      ...normal,
      ...normal.map((value) => value / 2),
      ...normal.map((value) => value / 2 + 7)
    ]);

    // Act
    const tier = CONSOLE_CAPABILITIES[ConsolePreset.GenesisH32].levels?.[1];

    // Assert
    expect(tier).toEqual({ limit: levels.size, needs: SpecialMode.ShadowHighlight });
  });
});
