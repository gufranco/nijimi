export enum ExportContainer {
  Mp4 = 'mp4',
  Webm = 'webm'
}

export interface ExportEncoding {
  readonly container: ExportContainer;
  readonly video: 'avc' | 'vp9';
  readonly audio: 'aac' | 'opus' | null;
}

interface Capabilities {
  readonly canEncodeVideo: (codec: 'avc' | 'vp9') => Promise<boolean>;
  readonly canEncodeAudio: (codec: 'aac' | 'opus') => Promise<boolean>;
}

const firstAudio = async (
  capabilities: Capabilities,
  codecs: readonly ('aac' | 'opus')[]
): Promise<'aac' | 'opus' | null> => {
  const able = await Promise.all(codecs.map((codec) => capabilities.canEncodeAudio(codec)));
  return codecs[able.indexOf(true)] ?? null;
};

export const pickExportEncoding = async (
  capabilities: Capabilities
): Promise<ExportEncoding | null> => {
  if (await capabilities.canEncodeVideo('avc')) {
    return {
      container: ExportContainer.Mp4,
      video: 'avc',
      audio: await firstAudio(capabilities, ['aac', 'opus'])
    };
  }
  if (await capabilities.canEncodeVideo('vp9')) {
    return {
      container: ExportContainer.Webm,
      video: 'vp9',
      audio: await firstAudio(capabilities, ['opus'])
    };
  }
  return null;
};
