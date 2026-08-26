import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import type { ScenarioVisualDiff } from '@stateproof-dev/core';

export interface ImageData {
  width: number;
  height: number;
  data: Uint8Array; // RGBA 4 bytes per pixel
}

// CRC-32 table for PNG chunk checksums
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer, offset: number, length: number): number {
  let c = 0xffffffff;
  for (let i = 0; i < length; i++) {
    c = (CRC_TABLE[(c ^ (buf[offset + i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buffer: Buffer): ImageData {
  // Check PNG signature
  if (
    buffer.length < 8 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer[4] !== 0x0d ||
    buffer[5] !== 0x0a ||
    buffer[6] !== 0x1a ||
    buffer[7] !== 0x0a
  ) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + length;

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataOffset);
      height = buffer.readUInt32BE(dataOffset + 4);
      bitDepth = buffer[dataOffset + 8] ?? 8;
      colorType = buffer[dataOffset + 9] ?? 6;
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataOffset, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4; // Skip CRC
  }

  if (width === 0 || height === 0) {
    throw new Error('Missing or invalid IHDR chunk in PNG');
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }

  const compressedData = Buffer.concat(idatChunks);
  const decompressed = inflateSync(compressedData);

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const stride = width * bytesPerPixel;
  const rawRgba = new Uint8Array(width * height * 4);

  let srcPos = 0;
  const prevRow = new Uint8Array(stride);
  const currRow = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[srcPos++] ?? 0;
    for (let i = 0; i < stride; i++) {
      currRow[i] = decompressed[srcPos++] ?? 0;
    }

    // Apply inverse filtering
    switch (filterType) {
      case 0: // None
        break;
      case 1: // Sub
        for (let x = bytesPerPixel; x < stride; x++) {
          currRow[x] = ((currRow[x] ?? 0) + (currRow[x - bytesPerPixel] ?? 0)) & 0xff;
        }
        break;
      case 2: // Up
        for (let x = 0; x < stride; x++) {
          currRow[x] = ((currRow[x] ?? 0) + (prevRow[x] ?? 0)) & 0xff;
        }
        break;
      case 3: // Average
        for (let x = 0; x < stride; x++) {
          const left = x >= bytesPerPixel ? (currRow[x - bytesPerPixel] ?? 0) : 0;
          const up = prevRow[x] ?? 0;
          currRow[x] = ((currRow[x] ?? 0) + Math.floor((left + up) / 2)) & 0xff;
        }
        break;
      case 4: // Paeth
        for (let x = 0; x < stride; x++) {
          const left = x >= bytesPerPixel ? (currRow[x - bytesPerPixel] ?? 0) : 0;
          const up = prevRow[x] ?? 0;
          const upLeft = x >= bytesPerPixel ? (prevRow[x - bytesPerPixel] ?? 0) : 0;
          currRow[x] = ((currRow[x] ?? 0) + paethPredictor(left, up, upLeft)) & 0xff;
        }
        break;
      default:
        break;
    }

    // Convert to RGBA
    const destRowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const destIndex = destRowOffset + x * 4;
      const srcIndex = x * bytesPerPixel;

      if (colorType === 6) {
        rawRgba[destIndex] = currRow[srcIndex] ?? 0;
        rawRgba[destIndex + 1] = currRow[srcIndex + 1] ?? 0;
        rawRgba[destIndex + 2] = currRow[srcIndex + 2] ?? 0;
        rawRgba[destIndex + 3] = currRow[srcIndex + 3] ?? 0;
      } else if (colorType === 2) {
        rawRgba[destIndex] = currRow[srcIndex] ?? 0;
        rawRgba[destIndex + 1] = currRow[srcIndex + 1] ?? 0;
        rawRgba[destIndex + 2] = currRow[srcIndex + 2] ?? 0;
        rawRgba[destIndex + 3] = 255;
      } else if (colorType === 0) {
        const v = currRow[srcIndex] ?? 0;
        rawRgba[destIndex] = v;
        rawRgba[destIndex + 1] = v;
        rawRgba[destIndex + 2] = v;
        rawRgba[destIndex + 3] = 255;
      }
    }

    prevRow.set(currRow);
  }

  return { width, height, data: rawRgba };
}

export function encodePng(img: ImageData): Buffer {
  const { width, height, data } = img;
  const stride = width * 4;
  const uncompressed = Buffer.alloc(height * (1 + stride));

  let destPos = 0;
  for (let y = 0; y < height; y++) {
    uncompressed[destPos++] = 0; // Filter: None
    const srcRowOffset = y * stride;
    for (let x = 0; x < stride; x++) {
      uncompressed[destPos++] = data[srcRowOffset + x] ?? 0;
    }
  }

  const idatData = deflateSync(uncompressed, { level: 6 });

  // PNG structure: 8 header + 25 IHDR + (12 + idatData.length) IDAT + 12 IEND = 57 + idatData.length
  const totalLength = 8 + 25 + (12 + idatData.length) + 12;
  const png = Buffer.alloc(totalLength);

  // PNG Signature
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

  // IHDR chunk
  let pos = 8;
  png.writeUInt32BE(13, pos); // length
  png.write('IHDR', pos + 4, 4, 'ascii');
  png.writeUInt32BE(width, pos + 8);
  png.writeUInt32BE(height, pos + 12);
  png[pos + 16] = 8; // bit depth
  png[pos + 17] = 6; // RGBA color type
  png[pos + 18] = 0; // compression
  png[pos + 19] = 0; // filter
  png[pos + 20] = 0; // interlace
  png.writeUInt32BE(crc32(png, pos + 4, 17), pos + 21);
  pos += 25;

  // IDAT chunk
  png.writeUInt32BE(idatData.length, pos);
  png.write('IDAT', pos + 4, 4, 'ascii');
  idatData.copy(png, pos + 8);
  png.writeUInt32BE(crc32(png, pos + 4, idatData.length + 4), pos + 8 + idatData.length);
  pos += 12 + idatData.length;

  // IEND chunk
  png.writeUInt32BE(0, pos);
  png.write('IEND', pos + 4, 4, 'ascii');
  png.writeUInt32BE(crc32(png, pos + 4, 4), pos + 8);

  return png;
}

export interface DiffResult {
  diffRatio: number;
  diffPixels: number;
  totalPixels: number;
  diffImage: ImageData;
}

export function compareImages(
  img1: ImageData,
  img2: ImageData,
  options: { threshold?: number } = {},
): DiffResult {
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);
  const totalPixels = width * height;
  const diffData = new Uint8Array(totalPixels * 4);

  let diffPixels = 0;
  // Perceptual pixel tolerance: default 0.1 (scaled to 0..255 is ~25.5)
  const pixelTolerance = (options.threshold ?? 0.1) * 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const in1 = x < img1.width && y < img1.height;
      const in2 = x < img2.width && y < img2.height;

      if (!in1 || !in2) {
        // Dimension mismatch pixel: mark diff
        diffData[idx] = 255;
        diffData[idx + 1] = 0;
        diffData[idx + 2] = 0;
        diffData[idx + 3] = 255;
        diffPixels++;
        continue;
      }

      const idx1 = (y * img1.width + x) * 4;
      const idx2 = (y * img2.width + x) * 4;

      const r1 = img1.data[idx1] ?? 0;
      const g1 = img1.data[idx1 + 1] ?? 0;
      const b1 = img1.data[idx1 + 2] ?? 0;
      const a1 = img1.data[idx1 + 3] ?? 0;

      const r2 = img2.data[idx2] ?? 0;
      const g2 = img2.data[idx2 + 1] ?? 0;
      const b2 = img2.data[idx2 + 2] ?? 0;
      const a2 = img2.data[idx2 + 3] ?? 0;

      const dr = Math.abs(r1 - r2);
      const dg = Math.abs(g1 - g2);
      const db = Math.abs(b1 - b2);
      const da = Math.abs(a1 - a2);

      const delta = (dr + dg + db + da) / 4;

      if (delta > pixelTolerance) {
        // Highlight diff pixel with red
        diffData[idx] = 255;
        diffData[idx + 1] = 0;
        diffData[idx + 2] = 0;
        diffData[idx + 3] = 255;
        diffPixels++;
      } else {
        // Dimmed grayscale rendering for context
        const gray = Math.round((r1 * 0.299 + g1 * 0.587 + b1 * 0.114) * 0.3 + 178);
        diffData[idx] = gray;
        diffData[idx + 1] = gray;
        diffData[idx + 2] = gray;
        diffData[idx + 3] = 255;
      }
    }
  }

  const diffRatio = diffPixels / totalPixels;
  return {
    diffRatio,
    diffPixels,
    totalPixels,
    diffImage: { width, height, data: diffData },
  };
}

export interface RunVisualDiffOptions {
  scenarioName: string;
  scenarioId: string;
  viewportName: string;
  screenshotBuffer: Buffer;
  baselineDir?: string | undefined;
  artifactDir: string;
  updateBaselines?: boolean | undefined;
  diffThreshold?: number | undefined; // Allowed overall diff ratio, default 0.001 (0.1%)
}

export interface VisualDiffExecutionResult {
  status: 'passed' | 'failed';
  failureCode?: 'visual-diff-exceeded' | undefined;
  message?: string | undefined;
  hint?: string | undefined;
  visualDiff?: ScenarioVisualDiff | undefined;
}

export function runVisualDiff(options: RunVisualDiffOptions): VisualDiffExecutionResult {
  const {
    scenarioName,
    scenarioId,
    viewportName,
    screenshotBuffer,
    artifactDir,
    updateBaselines,
    diffThreshold = 0.001,
  } = options;

  const baseDir = options.baselineDir ?? join(process.cwd(), 'stateproof', 'baselines');
  const targetBaselineDir = join(baseDir, scenarioName);
  const baselineFilePath = join(targetBaselineDir, `${scenarioId}.${viewportName}.png`);

  const currentArtifactName = `${scenarioId}.${viewportName}.current.png`;
  const baselineArtifactName = `${scenarioId}.${viewportName}.baseline.png`;
  const diffArtifactName = `${scenarioId}.${viewportName}.diff.png`;

  const currentArtifactPath = join(artifactDir, currentArtifactName);
  const baselineArtifactPath = join(artifactDir, baselineArtifactName);
  const diffArtifactPath = join(artifactDir, diffArtifactName);

  // 1. Update Baselines mode
  if (updateBaselines) {
    mkdirSync(targetBaselineDir, { recursive: true });
    writeFileSync(baselineFilePath, screenshotBuffer);
    return {
      status: 'passed',
      visualDiff: {
        baseline: baselineArtifactName,
        current: currentArtifactName,
        diffRatio: 0,
        threshold: diffThreshold,
      },
    };
  }

  // 2. Diff comparison mode: check if baseline exists
  if (!existsSync(baselineFilePath)) {
    return {
      status: 'failed',
      failureCode: 'visual-diff-exceeded',
      message: `Baseline image not found: ${baselineFilePath}`,
      hint: 'Run `stateproof run --update-baselines` to create baselines.',
    };
  }

  const baselineBuffer = readFileSync(baselineFilePath);
  const currentImg = decodePng(screenshotBuffer);
  const baselineImg = decodePng(baselineBuffer);

  const result = compareImages(baselineImg, currentImg, { threshold: 0.1 });

  // Save artifacts for evidence
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(currentArtifactPath, screenshotBuffer);
  writeFileSync(baselineArtifactPath, baselineBuffer);

  const diffPngBuffer = encodePng(result.diffImage);
  writeFileSync(diffArtifactPath, diffPngBuffer);

  const visualDiffInfo: ScenarioVisualDiff = {
    baseline: baselineArtifactName,
    current: currentArtifactName,
    diff: diffArtifactName,
    diffRatio: result.diffRatio,
    threshold: diffThreshold,
  };

  if (result.diffRatio > diffThreshold) {
    const actualPercent = (result.diffRatio * 100).toFixed(2);
    const thresholdPercent = (diffThreshold * 100).toFixed(2);
    return {
      status: 'failed',
      failureCode: 'visual-diff-exceeded',
      message: `Visual diff exceeded threshold (${actualPercent}% > ${thresholdPercent}%). Changed pixels: ${result.diffPixels}/${result.totalPixels}.`,
      hint: 'Inspect diff artifact; if the UI change is intentional, run: stateproof run --update-baselines',
      visualDiff: visualDiffInfo,
    };
  }

  return {
    status: 'passed',
    visualDiff: visualDiffInfo,
  };
}
