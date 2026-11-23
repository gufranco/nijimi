import type { AppSettings } from '../settings/types';
import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { FrameView } from '../signal/frameView';
import { VideoStandard } from '../signal/videoStandard';
import type { Elements } from './queryElements';

const QUADRATURE: readonly Connection[] = [Connection.Rf, Connection.Composite, Connection.SVideo];
const SEPARATED: readonly Connection[] = [Connection.Rf, Connection.Composite];

const show = (element: HTMLElement, visible: boolean): void => {
  element.toggleAttribute('hidden', !visible);
};

export const updateVisibility = (elements: Elements, settings: AppSettings): void => {
  const { connection, standard, preset, frameView } = settings.signal;
  const quadrature = QUADRATURE.includes(connection);
  show(elements.rfGroup, connection === Connection.Rf);
  show(elements.separationField, SEPARATED.includes(connection));
  show(elements.hueField, quadrature);
  show(elements.saturationField, connection !== Connection.Rgb);
  show(elements.palField, quadrature && standard !== VideoStandard.Ntsc);
  show(elements.customTiming, preset === ConsolePreset.Custom);
  show(elements.frameField, frameView === FrameView.Single);
};
