import { CrtModel } from './crtModel';
import { MaskKind } from './maskKind';
import type { DisplaySettings } from './types';

export type CrtLook = Pick<
  DisplaySettings,
  'scanlines' | 'mask' | 'maskStrength' | 'maskPitch' | 'bloom' | 'curvature'
>;

type Preset = (
  mask: MaskKind,
  maskPitch: number,
  maskStrength: number,
  scanlines: number,
  bloom: number,
  curvature: number
) => CrtLook;

const look: Preset = (mask, maskPitch, maskStrength, scanlines, bloom, curvature) => ({
  mask,
  maskPitch,
  maskStrength,
  scanlines,
  bloom,
  curvature
});

export const CRT_PRESETS: Readonly<Record<Exclude<CrtModel, CrtModel.Custom>, CrtLook>> = {
  [CrtModel.ConsumerShadowMask]: look(MaskKind.ShadowMask, 2, 0.5, 0.3, 0.35, 0.25),
  [CrtModel.ConsumerApertureGrille]: look(MaskKind.ApertureGrille, 2, 0.4, 0.4, 0.3, 0.15),
  [CrtModel.ConsumerSlotMask]: look(MaskKind.SlotMask, 2, 0.45, 0.35, 0.3, 0.2),
  [CrtModel.ProfessionalMonitor]: look(MaskKind.ApertureGrille, 1, 0.35, 0.8, 0.15, 0.05),
  [CrtModel.BroadcastMonitor]: look(MaskKind.ApertureGrille, 1, 0.25, 0.95, 0.1, 0),
  [CrtModel.PcMonitor]: look(MaskKind.ShadowMask, 1, 0.3, 0.9, 0.1, 0.05),
  [CrtModel.ArcadeMonitor]: look(MaskKind.ShadowMask, 2, 0.45, 0.7, 0.25, 0.2),
  [CrtModel.HandheldLcd]: look(MaskKind.LcdGrid, 1, 0.6, 0, 0, 0)
};
