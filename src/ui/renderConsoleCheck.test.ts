import { describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { CheckOutcome } from '../signal/checkOutcome';
import { ConsolePreset } from '../signal/consolePreset';
import { SpecialMode } from '../signal/specialMode';
import type { ConsoleReport } from '../signal/types';
import { renderConsoleCheck } from './renderConsoleCheck';

const lines = (list: HTMLElement): readonly (readonly [string, string])[] =>
  Array.from(list.children, (item) => [item.getAttribute('data-outcome') ?? '', item.textContent]);

const FAILING: ConsoleReport = {
  resolution: {
    outcome: CheckOutcome.Fail,
    width: 300,
    height: 200,
    needs: [],
    fitting: []
  },
  colors: {
    outcome: CheckOutcome.NeedsMode,
    found: 100,
    limit: 183,
    needs: SpecialMode.ShadowHighlight
  },
  levels: { outcome: CheckOutcome.Fail, found: 40, limit: 15, needs: null }
};

describe('renderConsoleCheck', () => {
  it('lists a passing picture in one line per check', () => {
    // Arrange
    const list = document.createElement('ul');
    const report: ConsoleReport = {
      resolution: {
        outcome: CheckOutcome.Pass,
        width: 320,
        height: 224,
        needs: [],
        fitting: [ConsolePreset.GenesisH40]
      },
      colors: { outcome: CheckOutcome.Pass, found: 40, limit: 61, needs: null },
      levels: { outcome: CheckOutcome.Pass, found: 6, limit: 8, needs: null }
    };

    // Act
    renderConsoleCheck({ list, report, locale: Locale.En });

    // Assert
    expect(lines(list)).toEqual([
      ['pass', '320x224: a native resolution of this preset.'],
      ['pass', '40 colors on screen, within the limit of 61.'],
      ['pass', 'Up to 6 levels per color channel, within the 8 of its palette.']
    ]);
  });

  it('explains failures, the mode a picture needs, and that no preset fits', () => {
    // Arrange
    const list = document.createElement('ul');

    // Act
    renderConsoleCheck({ list, report: FAILING, locale: Locale.En });

    // Assert
    expect(lines(list)).toEqual([
      ['fail', '300x200: not a resolution this preset draws.'],
      ['fail', 'No preset draws this size.'],
      ['needs-mode', '100 colors on screen: needs shadow/highlight, which allows up to 183.'],
      ['fail', '40 levels per color channel: more than the 15 its palette has.']
    ]);
  });

  it('names the fitting presets and every mode a size needs, in Portuguese', () => {
    // Arrange
    const list = document.createElement('ul');
    const report: ConsoleReport = {
      ...FAILING,
      resolution: {
        outcome: CheckOutcome.NeedsMode,
        width: 320,
        height: 480,
        needs: [SpecialMode.PalV30, SpecialMode.Interlace],
        fitting: [ConsolePreset.GenesisH40, ConsolePreset.Ps1W320]
      }
    };

    // Act
    renderConsoleCheck({ list, report, locale: Locale.PtBr });

    // Assert
    expect(lines(list).slice(0, 2)).toEqual([
      ['needs-mode', '320x480: este preset só desenha com modo V30 PAL + entrelaçamento.'],
      [
        'needs-mode',
        'Presets que desenham este tamanho: Mega Drive, H40; PlayStation, 320 de largura.'
      ]
    ]);
  });

  it('says the NES palette is not checked', () => {
    // Arrange
    const list = document.createElement('ul');
    const report: ConsoleReport = {
      ...FAILING,
      levels: { outcome: CheckOutcome.NotApplicable, found: 9, limit: 0, needs: null }
    };

    // Act
    renderConsoleCheck({ list, report, locale: Locale.En });

    // Assert
    expect(lines(list).at(-1)).toEqual([
      'not-applicable',
      'Palette values not checked: NES colors have no fixed RGB values.'
    ]);
  });

  it('says custom timing has no console check', () => {
    // Arrange
    const list = document.createElement('ul');

    // Act
    renderConsoleCheck({ list, report: null, locale: Locale.En });

    // Assert
    expect(lines(list)).toEqual([['not-applicable', 'Custom timing: no console check.']]);
  });
});
