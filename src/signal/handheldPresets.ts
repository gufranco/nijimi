import { ConsolePreset } from './consolePreset';

export const HANDHELD_PRESETS: ReadonlySet<ConsolePreset> = new Set([
  ConsolePreset.GameBoy,
  ConsolePreset.GameBoyPocket,
  ConsolePreset.GameBoyColor,
  ConsolePreset.GameGear
]);
