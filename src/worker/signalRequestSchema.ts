import { z } from 'zod';

import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { FrameView } from '../signal/frameView';
import { PalDecoding } from '../signal/palDecoding';
import { ScanMode } from '../signal/scanMode';
import { Separation } from '../signal/separation';
import { VideoStandard } from '../signal/videoStandard';

const MAX_SIDE = 1024;
const MAX_FRAMES = 2;
const unit = z.number().min(0).max(1);

const frameSchema = z
  .object({
    width: z.number().int().min(1).max(MAX_SIDE),
    height: z.number().int().min(1).max(MAX_SIDE),
    data: z.instanceof(Float32Array)
  })
  .refine((frame) => frame.data.length === frame.width * frame.height * 3, {
    message: 'frame data does not match its size'
  });

const settingsSchema = z.object({
  connection: z.enum(Connection),
  standard: z.enum(VideoStandard),
  preset: z.enum(ConsolePreset),
  custom: z.object({
    dotClockHz: z.number().min(3e6).max(14e6),
    cyclesPerLine: z.number().min(200).max(300)
  }),
  separation: z.enum(Separation),
  palDecoding: z.enum(PalDecoding),
  scan: z.enum(ScanMode),
  frameView: z.enum(FrameView),
  frameIndex: z.number().int().min(0).max(11),
  hueDegrees: z.number().min(-45).max(45),
  saturation: z.number().min(0).max(2),
  gamma: z.number().min(2).max(3),
  rf: z.object({ noise: unit, ghost: unit, beat: unit }),
  seed: z.number().int().min(0)
});

export const signalRequestSchema = z.object({
  id: z.number().int().min(0),
  frames: z.tuple([frameSchema], frameSchema).refine((frames) => frames.length <= MAX_FRAMES),
  settings: settingsSchema
});
