import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareImages, decodePng, encodePng, type ImageData, runVisualDiff } from './diff.js';

function createSolidImage(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): ImageData {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = a;
  }
  return { width, height, data };
}

describe('PNG Encoder & Decoder', () => {
  it('encodes and decodes RGBA images losslessly', () => {
    const img = createSolidImage(10, 10, 120, 200, 50, 255);
    // Add a unique pixel
    img.data[0] = 255;
    img.data[1] = 0;
    img.data[2] = 128;
    img.data[3] = 255;

    const encoded = encodePng(img);
    expect(encoded).toBeInstanceOf(Buffer);
    expect(encoded.length).toBeGreaterThan(50);

    const decoded = decodePng(encoded);
    expect(decoded.width).toBe(10);
    expect(decoded.height).toBe(10);
    expect(decoded.data[0]).toBe(255);
    expect(decoded.data[1]).toBe(0);
    expect(decoded.data[2]).toBe(128);
    expect(decoded.data[3]).toBe(255);
    expect(decoded.data[4]).toBe(120);
    expect(decoded.data[5]).toBe(200);
    expect(decoded.data[6]).toBe(50);
  });

  it('rejects non-PNG buffer', () => {
    const invalid = Buffer.from('hello not a png');
    expect(() => decodePng(invalid)).toThrow('Invalid PNG signature');
  });
});

describe('compareImages (Pixel Comparison)', () => {
  it('returns diffRatio 0 for identical images', () => {
    const img1 = createSolidImage(20, 20, 100, 150, 200);
    const img2 = createSolidImage(20, 20, 100, 150, 200);

    const result = compareImages(img1, img2);
    expect(result.diffRatio).toBe(0);
    expect(result.diffPixels).toBe(0);
    expect(result.totalPixels).toBe(400);
  });

  it('detects changed pixels and marks diff with red', () => {
    const img1 = createSolidImage(10, 10, 0, 0, 0);
    const img2 = createSolidImage(10, 10, 0, 0, 0);

    // Modify 5 pixels
    for (let i = 0; i < 5; i++) {
      img2.data[i * 4] = 255;
      img2.data[i * 4 + 1] = 255;
      img2.data[i * 4 + 2] = 255;
    }

    const result = compareImages(img1, img2, { threshold: 0.1 });
    expect(result.diffPixels).toBe(5);
    expect(result.diffRatio).toBe(5 / 100);

    // Verify first pixel in diffImage is red ([255, 0, 0, 255])
    expect(result.diffImage.data[0]).toBe(255);
    expect(result.diffImage.data[1]).toBe(0);
    expect(result.diffImage.data[2]).toBe(0);
    expect(result.diffImage.data[3]).toBe(255);
  });
});

describe('runVisualDiff', () => {
  const testRoot = join(tmpdir(), `sp-diff-test-${Date.now()}`);
  const baselineDir = join(testRoot, 'baselines');
  const artifactDir = join(testRoot, 'artifacts');

  it('creates baselines in updateBaselines mode', () => {
    mkdirSync(artifactDir, { recursive: true });
    const img = createSolidImage(10, 10, 50, 100, 150);
    const pngBuffer = encodePng(img);

    const result = runVisualDiff({
      scenarioName: 'account-settings',
      scenarioId: 'account-loading',
      viewportName: 'desktop',
      screenshotBuffer: pngBuffer,
      baselineDir,
      artifactDir,
      updateBaselines: true,
    });

    expect(result.status).toBe('passed');
    const expectedBaselineFile = join(
      baselineDir,
      'account-settings',
      'account-loading.desktop.png',
    );
    expect(existsSync(expectedBaselineFile)).toBe(true);
  });

  it('fails if baseline is missing in diff mode', () => {
    const img = createSolidImage(10, 10, 50, 100, 150);
    const pngBuffer = encodePng(img);

    const result = runVisualDiff({
      scenarioName: 'account-settings',
      scenarioId: 'non-existent-scenario',
      viewportName: 'desktop',
      screenshotBuffer: pngBuffer,
      baselineDir,
      artifactDir,
      updateBaselines: false,
    });

    expect(result.status).toBe('failed');
    expect(result.failureCode).toBe('visual-diff-exceeded');
    expect(result.hint).toContain('--update-baselines');
  });

  it('passes diff when current matches baseline within threshold', () => {
    const img = createSolidImage(10, 10, 50, 100, 150);
    const pngBuffer = encodePng(img);

    // Create baseline first
    runVisualDiff({
      scenarioName: 'account-settings',
      scenarioId: 'account-match',
      viewportName: 'desktop',
      screenshotBuffer: pngBuffer,
      baselineDir,
      artifactDir,
      updateBaselines: true,
    });

    // Run diff with identical image
    const diffResult = runVisualDiff({
      scenarioName: 'account-settings',
      scenarioId: 'account-match',
      viewportName: 'desktop',
      screenshotBuffer: pngBuffer,
      baselineDir,
      artifactDir,
      updateBaselines: false,
      diffThreshold: 0.001,
    });

    expect(diffResult.status).toBe('passed');
    expect(diffResult.visualDiff?.diffRatio).toBe(0);
  });

  it('fails diff and saves diff artifacts when threshold is exceeded', () => {
    const img1 = createSolidImage(10, 10, 0, 0, 0);
    const img2 = createSolidImage(10, 10, 255, 255, 255);

    const baselineBuffer = encodePng(img1);
    const currentBuffer = encodePng(img2);

    runVisualDiff({
      scenarioName: 'account-settings',
      scenarioId: 'account-diff-exceeded',
      viewportName: 'desktop',
      screenshotBuffer: baselineBuffer,
      baselineDir,
      artifactDir,
      updateBaselines: true,
    });

    const diffResult = runVisualDiff({
      scenarioName: 'account-settings',
      scenarioId: 'account-diff-exceeded',
      viewportName: 'desktop',
      screenshotBuffer: currentBuffer,
      baselineDir,
      artifactDir,
      updateBaselines: false,
      diffThreshold: 0.01,
    });

    expect(diffResult.status).toBe('failed');
    expect(diffResult.failureCode).toBe('visual-diff-exceeded');
    expect(diffResult.visualDiff?.diffRatio).toBe(1);

    // Verify artifacts were written to artifactDir
    expect(existsSync(join(artifactDir, 'account-diff-exceeded.desktop.current.png'))).toBe(true);
    expect(existsSync(join(artifactDir, 'account-diff-exceeded.desktop.baseline.png'))).toBe(true);
    expect(existsSync(join(artifactDir, 'account-diff-exceeded.desktop.diff.png'))).toBe(true);
  });
});
