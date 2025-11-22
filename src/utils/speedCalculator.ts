import type {CalibrationData, CarPosition, SpeedMeasurement, ColorRange} from '../types';
import {HOT_WHEELS_SCALE} from '../types';

/**
 * Calculate speed from car positions
 */
export function calculateSpeed(
  positions: CarPosition[],
  calibration: CalibrationData,
  fps: number,
): SpeedMeasurement | null {
  if (positions.length < 2) {
    return null;
  }

  // Find when car enters and exits the calibrated zone
  const entryPosition = positions.find(
    p => p.x >= calibration.markerStartX && p.confidence > 0.5,
  );
  const exitPosition = [...positions]
    .reverse()
    .find(p => p.x >= calibration.markerEndX && p.confidence > 0.5);

  if (!entryPosition || !exitPosition) {
    return null;
  }

  // Calculate time difference
  const framesDiff = exitPosition.frameNumber - entryPosition.frameNumber;
  if (framesDiff <= 0) {
    return null;
  }

  const timeSeconds = framesDiff / fps;
  const timeMs = timeSeconds * 1000;

  // Calculate speed
  const distanceMeters = calibration.distanceMeters;
  const speedMs = distanceMeters / timeSeconds; // meters per second
  const speedKmh = speedMs * 3.6; // convert to km/h

  // Calculate scale speed (what it would be at full scale)
  const scaleSpeedKmh = speedKmh * HOT_WHEELS_SCALE;

  return {
    speedKmh: Math.round(speedKmh * 100) / 100,
    scaleSpeedKmh: Math.round(scaleSpeedKmh * 100) / 100,
    timeMs: Math.round(timeMs),
    distanceMeters,
    startFrame: entryPosition.frameNumber,
    endFrame: exitPosition.frameNumber,
    fps,
  };
}

/**
 * Convert RGB to HSV for color detection
 */
export function rgbToHsv(r: number, g: number, b: number): {h: number; s: number; v: number} {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;

  if (diff !== 0) {
    switch (max) {
      case r:
        h = 60 * (((g - b) / diff) % 6);
        break;
      case g:
        h = 60 * ((b - r) / diff + 2);
        break;
      case b:
        h = 60 * ((r - g) / diff + 4);
        break;
    }
  }

  if (h < 0) {
    h += 360;
  }

  return {h, s, v};
}

/**
 * Check if a color matches the target color range
 */
export function colorMatchesRange(
  r: number,
  g: number,
  b: number,
  range: ColorRange,
): boolean {
  const {h, s, v} = rgbToHsv(r, g, b);

  const hueMatch =
    (h >= range.hueMin && h <= range.hueMax) ||
    (range.name === 'Red (wrap)' && (h >= 350 || h <= 10));
  const satMatch = s >= range.saturationMin && s <= range.saturationMax;
  const valMatch = v >= range.valueMin && v <= range.valueMax;

  return hueMatch && satMatch && valMatch;
}

/**
 * Simple blob detection - find the largest blob of target color
 * Returns normalized position (0-1 range)
 */
export function detectColorBlob(
  imageData: Uint8Array,
  width: number,
  height: number,
  colorRange: ColorRange,
  roi?: {x: number; y: number; width: number; height: number},
): {x: number; y: number; confidence: number} | null {
  const startX = roi ? Math.floor(roi.x * width) : 0;
  const startY = roi ? Math.floor(roi.y * height) : 0;
  const endX = roi ? Math.floor((roi.x + roi.width) * width) : width;
  const endY = roi ? Math.floor((roi.y + roi.height) * height) : height;

  let sumX = 0;
  let sumY = 0;
  let matchCount = 0;

  // Step through pixels (sample every 4th pixel for performance)
  const step = 4;
  for (let y = startY; y < endY; y += step) {
    for (let x = startX; x < endX; x += step) {
      const idx = (y * width + x) * 4; // RGBA format
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      if (colorMatchesRange(r, g, b, colorRange)) {
        sumX += x;
        sumY += y;
        matchCount++;
      }
    }
  }

  if (matchCount < 10) {
    return null; // Not enough pixels found
  }

  // Calculate centroid
  const centroidX = sumX / matchCount;
  const centroidY = sumY / matchCount;

  // Normalize to 0-1 range
  const normalizedX = centroidX / width;
  const normalizedY = centroidY / height;

  // Calculate confidence based on blob size
  const totalPixelsInRoi = ((endX - startX) / step) * ((endY - startY) / step);
  const confidence = Math.min(matchCount / (totalPixelsInRoi * 0.1), 1);

  return {
    x: normalizedX,
    y: normalizedY,
    confidence,
  };
}

/**
 * Format speed for display
 */
export function formatSpeed(speedKmh: number): string {
  if (speedKmh < 1) {
    return `${(speedKmh * 1000).toFixed(0)} m/h`;
  }
  return `${speedKmh.toFixed(2)} km/h`;
}

/**
 * Format time for display
 */
export function formatTime(timeMs: number): string {
  if (timeMs < 1000) {
    return `${timeMs.toFixed(0)} ms`;
  }
  return `${(timeMs / 1000).toFixed(2)} s`;
}
