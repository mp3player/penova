export function safeFilename(title: string, ext: string): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');
  const cleanExt = ext.replace(/^\./, '') || 'bin';
  return `${cleaned || 'penova-lesson'}.${cleanExt}`;
}

export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('导出已取消', 'AbortError');
  }
}

export function createOffscreenCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (typeof document === 'undefined') {
    throw new Error('当前环境不支持 2D 离屏画布导出');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法初始化离屏 2D 画布');
  }
  return { canvas, ctx };
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType = 'image/png',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`画布编码为 ${mimeType} 失败`));
        }
      },
      mimeType,
      quality
    );
  });
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export interface TarEntry {
  name: string;
  data: Uint8Array;
}

const textEncoder = new TextEncoder();

function writeAsciiField(
  buf: Uint8Array,
  offset: number,
  maxLen: number,
  str: string
): void {
  const bytes = textEncoder.encode(str);
  const count = Math.min(maxLen, bytes.length);
  buf.set(bytes.subarray(0, count), offset);
}

/**
 * Builds a POSIX ustar archive cleanly in memory with 512-byte headers,
 * valid unsigned byte checksums, and two zero EOF blocks.
 */
export function buildTarArchive(entries: TarEntry[]): Uint8Array {
  const mtimeOctal = Math.floor(Date.now() / 1000)
    .toString(8)
    .padStart(11, '0');

  let totalBytes = 1024; // two 512-byte EOF zero blocks
  const prepared = entries.map((entry) => {
    const paddedDataLen = Math.ceil(entry.data.length / 512) * 512;
    totalBytes += 512 + paddedDataLen;
    return { entry, paddedDataLen };
  });

  const out = new Uint8Array(totalBytes);
  let cursor = 0;

  for (const { entry, paddedDataLen } of prepared) {
    const header = out.subarray(cursor, cursor + 512);

    // Split long paths across ustar prefix (345..499) + name (0..99) when needed
    const nameBytes = textEncoder.encode(entry.name);
    if (nameBytes.length <= 100) {
      header.set(nameBytes, 0);
    } else {
      const slash = entry.name.lastIndexOf('/');
      if (slash > 0) {
        writeAsciiField(header, 345, 155, entry.name.slice(0, slash));
        writeAsciiField(header, 0, 100, entry.name.slice(slash + 1));
      } else {
        header.set(nameBytes.subarray(0, 100), 0);
      }
    }

    writeAsciiField(header, 100, 8, '0000644\0'); // mode
    writeAsciiField(header, 108, 8, '0000000\0'); // uid
    writeAsciiField(header, 116, 8, '0000000\0'); // gid
    writeAsciiField(
      header,
      124,
      12,
      `${entry.data.length.toString(8).padStart(11, '0')}\0`
    );
    writeAsciiField(header, 136, 12, `${mtimeOctal}\0`);
    header.fill(0x20, 148, 156); // checksum placeholder spaces
    header[156] = 0x30; // regular file ('0')
    writeAsciiField(header, 257, 6, 'ustar\0');
    writeAsciiField(header, 263, 2, '00');

    let sum = 0;
    for (let i = 0; i < 512; i++) {
      sum += header[i];
    }
    writeAsciiField(header, 148, 8, `${sum.toString(8).padStart(6, '0')}\0 `);

    cursor += 512;
    out.set(entry.data, cursor);
    cursor += paddedDataLen;
  }

  return out;
}
