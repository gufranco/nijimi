import { translate } from '../i18n/translate';
import type { Locale } from '../i18n/locale';
import type { MessageKey } from '../i18n/types';
import { CheckOutcome } from '../signal/checkOutcome';
import type { ConsolePreset } from '../signal/consolePreset';
import { SpecialMode } from '../signal/specialMode';
import type { ConsoleReport, ResolutionCheck, TierCheck } from '../signal/types';
import { PRESET_LABELS } from './presetLabels';

interface Line {
  readonly outcome: CheckOutcome;
  readonly text: string;
}

type Outcomes = Readonly<Record<CheckOutcome, MessageKey>>;

const MODE_NAMES: Readonly<Record<SpecialMode, MessageKey>> = {
  [SpecialMode.Interlace]: 'modeInterlace',
  [SpecialMode.PalV30]: 'modePalV30',
  [SpecialMode.Sms2Vdp]: 'modeSms2Vdp',
  [SpecialMode.SnesColorMath]: 'modeSnesColorMath',
  [SpecialMode.SnesColorMathOrDirectColor]: 'modeSnesColorMathOrDirectColor',
  [SpecialMode.ShadowHighlight]: 'modeShadowHighlight',
  [SpecialMode.Display24Bit]: 'modeDisplay24Bit',
  [SpecialMode.TextMode]: 'modeTextMode',
  [SpecialMode.DirectColor32x]: 'modeDirectColor32x',
  [SpecialMode.PerLineColors]: 'modePerLineColors',
  [SpecialMode.CustomLineCount]: 'modeCustomLineCount',
  [SpecialMode.GtiaLuminanceMode]: 'modeGtiaLuminanceMode',
  [SpecialMode.Framebuffer32Bit]: 'modeFramebuffer32Bit',
  [SpecialMode.SaturnCram24Bit]: 'modeSaturnCram24Bit',
  [SpecialMode.JaguarRgb24]: 'modeJaguarRgb24'
};

const RESOLUTION: Outcomes = {
  [CheckOutcome.Pass]: 'checkResolutionPass',
  [CheckOutcome.NeedsMode]: 'checkResolutionNeeds',
  [CheckOutcome.Fail]: 'checkResolutionFail',
  [CheckOutcome.NotApplicable]: 'checkResolutionFail'
};

const COLORS: Outcomes = {
  [CheckOutcome.Pass]: 'checkColorsPass',
  [CheckOutcome.NeedsMode]: 'checkColorsNeeds',
  [CheckOutcome.Fail]: 'checkColorsFail',
  [CheckOutcome.NotApplicable]: 'checkColorsFail'
};

const LEVELS: Outcomes = {
  [CheckOutcome.Pass]: 'checkLevelsPass',
  [CheckOutcome.NeedsMode]: 'checkLevelsNeeds',
  [CheckOutcome.Fail]: 'checkLevelsFail',
  [CheckOutcome.NotApplicable]: 'checkLevelsSkipped'
};

const presetName = (locale: Locale, preset: ConsolePreset): string =>
  translate(locale, PRESET_LABELS[preset]);

const modeName = (locale: Locale, mode: SpecialMode | null): string =>
  mode === null ? '' : translate(locale, MODE_NAMES[mode]);

const resolutionLines = (locale: Locale, check: ResolutionCheck): readonly Line[] => {
  const size = { width: String(check.width), height: String(check.height) };
  const modes = check.needs.map((mode) => modeName(locale, mode)).join(' + ');
  const main = {
    outcome: check.outcome,
    text: translate(locale, RESOLUTION[check.outcome], { ...size, modes })
  };
  if (check.outcome === CheckOutcome.Pass) {
    return [main];
  }
  const presets = check.fitting.map((preset) => presetName(locale, preset)).join('; ');
  const fitting =
    presets === ''
      ? translate(locale, 'checkFittingNone')
      : translate(locale, 'checkFitting', { presets });
  return [main, { outcome: check.outcome, text: fitting }];
};

const tierLine = (locale: Locale, check: TierCheck, keys: Outcomes): Line => ({
  outcome: check.outcome,
  text: translate(locale, keys[check.outcome], {
    found: String(check.found),
    limit: String(check.limit),
    mode: modeName(locale, check.needs)
  })
});

const reportLines = (locale: Locale, report: ConsoleReport | null): readonly Line[] =>
  report === null
    ? [{ outcome: CheckOutcome.NotApplicable, text: translate(locale, 'checkCustom') }]
    : [
        ...resolutionLines(locale, report.resolution),
        tierLine(locale, report.colors, COLORS),
        tierLine(locale, report.levels, LEVELS)
      ];

export const renderConsoleCheck = (input: {
  readonly list: HTMLElement;
  readonly report: ConsoleReport | null;
  readonly locale: Locale;
}): void => {
  const doc = input.list.ownerDocument;
  input.list.replaceChildren(
    ...reportLines(input.locale, input.report).map((line) => {
      const item = doc.createElement('li');
      item.dataset['outcome'] = line.outcome;
      item.textContent = line.text;
      return item;
    })
  );
};
