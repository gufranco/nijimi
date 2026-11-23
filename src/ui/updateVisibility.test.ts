import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { FrameView } from '../signal/frameView';
import { VideoStandard } from '../signal/videoStandard';
import { queryElements } from './queryElements';
import { SHELL_HTML } from './shellHtml';
import { updateVisibility } from './updateVisibility';
import type { Elements } from './queryElements';

const elements = (): Elements => {
  const root = document.createElement('div');
  root.innerHTML = SHELL_HTML;
  return queryElements(root);
};

const visible = (element: HTMLElement): boolean => !element.hidden;

describe('updateVisibility', () => {
  it('shows the RF tuner, separation, hue and saturation for RF', () => {
    // Arrange
    const ui = elements();
    const settings = {
      ...DEFAULT_SETTINGS,
      signal: { ...DEFAULT_SETTINGS.signal, connection: Connection.Rf }
    };

    // Act
    updateVisibility(ui, settings);

    // Assert
    expect(
      [
        ui.rfGroup,
        ui.separationField,
        ui.hueField,
        ui.saturationField,
        ui.palField,
        ui.customTiming,
        ui.frameField
      ].map(visible)
    ).toEqual([true, true, true, true, false, false, false]);
  });

  it('hides everything that RGB does not use', () => {
    // Arrange
    const ui = elements();
    const settings = {
      ...DEFAULT_SETTINGS,
      signal: {
        ...DEFAULT_SETTINGS.signal,
        connection: Connection.Rgb,
        standard: VideoStandard.PalM
      }
    };

    // Act
    updateVisibility(ui, settings);

    // Assert
    expect(
      [ui.rfGroup, ui.separationField, ui.hueField, ui.saturationField, ui.palField].map(visible)
    ).toEqual([false, false, false, false, false]);
  });

  it('shows the PAL decoder, custom timing and frame picker when they apply', () => {
    // Arrange
    const ui = elements();
    const signal = {
      ...DEFAULT_SETTINGS.signal,
      connection: Connection.SVideo,
      standard: VideoStandard.PalBg,
      preset: ConsolePreset.Custom,
      frameView: FrameView.Single
    };

    // Act
    updateVisibility(ui, { ...DEFAULT_SETTINGS, signal });

    // Assert
    expect([ui.palField, ui.customTiming, ui.frameField, ui.separationField].map(visible)).toEqual([
      true,
      true,
      true,
      false
    ]);
  });
});
