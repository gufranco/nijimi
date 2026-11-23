import { z } from 'zod';

import { Locale } from '../i18n/locale';
import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { FrameView } from '../signal/frameView';
import { HANDHELD_PRESETS } from '../signal/handheldPresets';
import { PalDecoding } from '../signal/palDecoding';
import { ScanMode } from '../signal/scanMode';
import { Separation } from '../signal/separation';
import type { SignalSettings } from '../signal/types';
import { VideoStandard } from '../signal/videoStandard';
import { CrtModel } from './crtModel';
import { CRT_PRESETS } from './crtPresets';
import { MaskKind } from './maskKind';
import { reconcileCrtModel } from './reconcileCrtModel';
import type { AppSettings, DisplaySettings } from './types';

export interface HashField {
  readonly key: string;
  readonly apply: (settings: AppSettings, raw: string) => AppSettings | null;
  readonly read: (settings: AppSettings) => string;
}

const unit = z.coerce.number().min(0).max(1);
const range = (min: number, max: number): z.ZodType<number> => z.coerce.number().min(min).max(max);
const whole = (min: number, max: number): z.ZodType<number> =>
  z.coerce.number().int().min(min).max(max);
const flag = z.enum(['0', '1']).transform((value) => value === '1');

const field = <T>(
  key: string,
  schema: z.ZodType<T>,
  read: (settings: AppSettings) => T,
  apply: (settings: AppSettings, value: T) => AppSettings,
  format: (value: T) => string = String
): HashField => ({
  key,
  apply: (settings, raw) => {
    const parsed = schema.safeParse(raw);
    return parsed.success ? apply(settings, parsed.data) : null;
  },
  read: (settings) => format(read(settings))
});

const signal = (settings: AppSettings, patch: Partial<SignalSettings>): AppSettings => ({
  ...settings,
  signal: { ...settings.signal, ...patch }
});

const display = (settings: AppSettings, patch: Partial<DisplaySettings>): AppSettings => ({
  ...settings,
  display: reconcileCrtModel({ ...settings.display, ...patch })
});

const model = (settings: AppSettings, crt: CrtModel): AppSettings => ({
  ...settings,
  display:
    crt === CrtModel.Custom
      ? { ...settings.display, crt }
      : { ...settings.display, ...CRT_PRESETS[crt], crt }
});

const rf = (settings: AppSettings, patch: Partial<SignalSettings['rf']>): AppSettings =>
  signal(settings, { rf: { ...settings.signal.rf, ...patch } });

const custom = (settings: AppSettings, patch: Partial<SignalSettings['custom']>): AppSettings =>
  signal(settings, { custom: { ...settings.signal.custom, ...patch } });

export const HASH_FIELDS: readonly HashField[] = [
  field(
    'c',
    z.enum(Connection),
    (s) => s.signal.connection,
    (s, connection) => signal(s, { connection })
  ),
  field(
    's',
    z.enum(VideoStandard),
    (s) => s.signal.standard,
    (s, standard) => signal(s, { standard })
  ),
  field(
    'p',
    z.enum(ConsolePreset),
    (s) => s.signal.preset,
    (s, preset) =>
      HANDHELD_PRESETS.has(preset)
        ? model(signal(s, { preset, connection: Connection.Rgb }), CrtModel.HandheldLcd)
        : signal(s, { preset })
  ),
  field(
    'cd',
    range(3e6, 14e6),
    (s) => s.signal.custom.dotClockHz,
    (s, dotClockHz) => custom(s, { dotClockHz })
  ),
  field(
    'cl',
    range(200, 300),
    (s) => s.signal.custom.cyclesPerLine,
    (s, cyclesPerLine) => custom(s, { cyclesPerLine })
  ),
  field(
    'sep',
    z.enum(Separation),
    (s) => s.signal.separation,
    (s, separation) => signal(s, { separation })
  ),
  field(
    'pal',
    z.enum(PalDecoding),
    (s) => s.signal.palDecoding,
    (s, palDecoding) => signal(s, { palDecoding })
  ),
  field(
    'scan',
    z.enum(ScanMode),
    (s) => s.signal.scan,
    (s, scan) => signal(s, { scan })
  ),
  field(
    'view',
    z.enum(FrameView),
    (s) => s.signal.frameView,
    (s, frameView) => signal(s, { frameView })
  ),
  field(
    'f',
    whole(0, 11),
    (s) => s.signal.frameIndex,
    (s, frameIndex) => signal(s, { frameIndex })
  ),
  field(
    'hue',
    range(-45, 45),
    (s) => s.signal.hueDegrees,
    (s, hueDegrees) => signal(s, { hueDegrees })
  ),
  field(
    'sat',
    range(0, 2),
    (s) => s.signal.saturation,
    (s, saturation) => signal(s, { saturation })
  ),
  field(
    'g',
    range(2, 3),
    (s) => s.signal.gamma,
    (s, gamma) => signal(s, { gamma })
  ),
  field(
    'rn',
    unit,
    (s) => s.signal.rf.noise,
    (s, noise) => rf(s, { noise })
  ),
  field(
    'rg',
    unit,
    (s) => s.signal.rf.ghost,
    (s, ghost) => rf(s, { ghost })
  ),
  field(
    'rb',
    unit,
    (s) => s.signal.rf.beat,
    (s, beat) => rf(s, { beat })
  ),
  field('t', z.enum(CrtModel), (s) => s.display.crt, model),
  field(
    'sl',
    unit,
    (s) => s.display.scanlines,
    (s, scanlines) => display(s, { scanlines })
  ),
  field(
    'm',
    z.enum(MaskKind),
    (s) => s.display.mask,
    (s, mask) => display(s, { mask })
  ),
  field(
    'ms',
    unit,
    (s) => s.display.maskStrength,
    (s, maskStrength) => display(s, { maskStrength })
  ),
  field(
    'mp',
    whole(1, 4),
    (s) => s.display.maskPitch,
    (s, maskPitch) => display(s, { maskPitch })
  ),
  field(
    'b',
    unit,
    (s) => s.display.bloom,
    (s, bloom) => display(s, { bloom })
  ),
  field(
    'cv',
    unit,
    (s) => s.display.curvature,
    (s, curvature) => display(s, { curvature })
  ),
  field(
    'os',
    flag,
    (s) => s.display.overscan,
    (s, overscan) => display(s, { overscan }),
    (value) => (value ? '1' : '0')
  ),
  field(
    'x',
    whole(0, 8),
    (s) => s.scale,
    (s, scale) => ({ ...s, scale })
  ),
  field(
    'seed',
    whole(0, 2 ** 31 - 1),
    (s) => s.signal.seed,
    (s, seed) => signal(s, { seed })
  ),
  field(
    'l',
    z.union([z.enum(Locale), z.literal('')]).transform((value) => (value === '' ? null : value)),
    (s) => s.locale,
    (s, locale) => ({ ...s, locale }),
    (value) => value ?? ''
  )
];
