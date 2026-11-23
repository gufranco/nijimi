import { ScanMode } from './scanMode';

export const isRowLit = (row: number, frameIndex: number, scan: ScanMode): boolean =>
  scan === ScanMode.Progressive || row % 2 === frameIndex % 2;
