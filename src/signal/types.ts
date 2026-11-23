import type { CheckOutcome } from './checkOutcome';
import type { SpecialMode } from './specialMode';
import type { Connection } from './connection';
import type { ConsolePreset } from './consolePreset';
import type { FrameView } from './frameView';
import type { PalDecoding } from './palDecoding';
import type { ScanMode } from './scanMode';
import type { Separation } from './separation';
import type { VideoStandard } from './videoStandard';

export interface RgbFrame {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
}

export interface RfSettings {
  readonly noise: number;
  readonly ghost: number;
  readonly beat: number;
}

export interface CustomTiming {
  readonly dotClockHz: number;
  readonly cyclesPerLine: number;
}

export interface SignalSettings {
  readonly connection: Connection;
  readonly standard: VideoStandard;
  readonly preset: ConsolePreset;
  readonly custom: CustomTiming;
  readonly separation: Separation;
  readonly palDecoding: PalDecoding;
  readonly scan: ScanMode;
  readonly frameView: FrameView;
  readonly frameIndex: number;
  readonly hueDegrees: number;
  readonly saturation: number;
  readonly gamma: number;
  readonly rf: RfSettings;
  readonly seed: number;
}

export interface SignalImage {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
  readonly sampleAspect: number;
  readonly frameCount: number;
}

export interface StandardSpec {
  readonly subcarrierHz: number;
  readonly lumaBandwidthHz: number;
  readonly chromaBandwidthHz: number;
  readonly narrowChromaBandwidthHz: number;
  readonly iqAxes: boolean;
  readonly lineAlternation: boolean;
  readonly squarePixelHz: number;
  readonly soundCarrierHz: number;
}

export interface ConsoleTiming {
  readonly masterPerCycle: number;
  readonly dotDivider: number;
  readonly masterPerLine: number;
  readonly linesPerFrame: number;
  readonly shortLineMaster: number;
}

export interface LineTiming {
  readonly dotClockHz: number;
  readonly cyclesPerLine: number;
  readonly linesPerFrame: number;
  readonly shortLineCycles: number;
}

export interface SamplingPlan {
  readonly samplesPerCycle: number;
  readonly sampleRateHz: number;
  readonly samplesPerPixel: number;
  readonly width: number;
}

export interface FrameInput {
  readonly frame: RgbFrame;
  readonly frameIndex: number;
  readonly settings: SignalSettings;
  readonly plan: SamplingPlan;
  readonly timing: LineTiming;
  readonly spec: StandardSpec;
}

export interface RenderedFrame {
  readonly rows: readonly (Float32Array | null)[];
}

export interface Biquad {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

export interface YuvRow {
  readonly y: Float64Array;
  readonly u: Float64Array;
  readonly v: Float64Array;
}

export interface RowContext {
  readonly cycles: number;
  readonly lineSwitch: number;
  readonly seed: number;
  readonly lineSeconds: number;
}

export interface ColorStats {
  readonly colors: number;
  readonly levels: number;
}

export interface Tier {
  readonly limit: number;
  readonly needs: SpecialMode | null;
}

export interface WidthRule {
  readonly width: number;
  readonly needs: readonly SpecialMode[];
}

export interface HeightRule {
  readonly min: number;
  readonly max: number;
  readonly needs: readonly SpecialMode[];
}

export interface ConsoleCapability {
  readonly widths: readonly WidthRule[];
  readonly heights: Readonly<Record<'ntsc' | 'pal', readonly HeightRule[]>>;
  readonly colors: Readonly<Record<'ntsc' | 'pal', readonly [Tier, ...Tier[]]>>;
  readonly levels: readonly [Tier, ...Tier[]] | null;
}

export interface TierCheck {
  readonly outcome: CheckOutcome;
  readonly found: number;
  readonly limit: number;
  readonly needs: SpecialMode | null;
}

export interface ResolutionCheck {
  readonly outcome: CheckOutcome;
  readonly width: number;
  readonly height: number;
  readonly needs: readonly SpecialMode[];
  readonly fitting: readonly ConsolePreset[];
}

export interface ConsoleReport {
  readonly resolution: ResolutionCheck;
  readonly colors: TierCheck;
  readonly levels: TierCheck;
}

export interface PackedSignalImage {
  readonly width: number;
  readonly height: number;
  readonly sampleAspect: number;
  readonly frameCount: number;
  readonly data: Uint8ClampedArray;
}
