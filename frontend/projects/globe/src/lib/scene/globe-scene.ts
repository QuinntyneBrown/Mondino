import type { Position } from '@mondino/api';
import type { GlobeOrientation } from '../motion/globe-motion';

/** One level of resolution and model detail the scene can be drawn at (ADR 0012). */
export interface DetailStep {
  /** The resolution the canvas is drawn at, in device pixels per CSS pixel. */
  readonly pixelRatio: number;
  /** Which of the model's meshes is shown. */
  readonly modelDetail: 'High' | 'Low';
}

/** The steps a device can be drawn at, the finest first. A step changes neither light, colour nor pins. */
export function detailSteps(devicePixelRatio: number): readonly DetailStep[] {
  return [
    { pixelRatio: Math.min(devicePixelRatio, 2), modelDetail: 'High' },
    { pixelRatio: 1, modelDetail: 'Low' },
  ];
}

/** The globe's colours as the scene needs them, read from the `--color-globe-*` tokens. */
export interface GlobePalette {
  readonly ocean: string;
  readonly oceanDeep: string;
  readonly land: string;
  readonly landDeep: string;
  readonly sand: string;
  readonly ice: string;
  readonly cloud: string;
  readonly night: string;
}

/** Where a position is drawn: a percentage of the box across and down, and how near the viewer. */
export interface ProjectedPoint {
  readonly x: number;
  readonly y: number;
  /** 1 facing the viewer, falling towards 0 at the rim. */
  readonly depth: number;
}

export type GlobeUnavailableReason = 'NoWebGL' | 'AssetsFailed' | 'ContextLost';

/** Why the 3D globe cannot be drawn; the still picture is shown in its place. */
export class GlobeUnavailableError extends Error {
  constructor(readonly reason: GlobeUnavailableReason) {
    super(`The 3D globe is unavailable: ${reason}`);
    this.name = 'GlobeUnavailableError';
  }
}

export interface GlobeSceneOptions {
  readonly detail: DetailStep;
  /** Cancels the renderer's import and the assets' fetches when the globe is left before they finish. */
  readonly signal: AbortSignal;
  /** Called if the WebGL context is lost while the globe is shown. */
  readonly onContextLost: () => void;
}

/** The orientation the globe faces when it starts: the still picture's, Europe and Africa. */
export const STARTING_ORIENTATION: GlobeOrientation = { longitude: 10.1, tilt: 17.4 };

/** The most time one frame reports, so a frame after a pause never jumps the globe (ADR 0013). */
export const MaxFrameMs = 100;

/**
 * The 3D globe: the renderer, the Blender-built model, its masks and the drawing, behind one
 * interface. Nothing else imports the renderer or reads the asset format.
 */
export interface GlobeScene {
  resize(width: number, height: number): void;
  setSun(subsolar: Position): void;
  setDetail(step: DetailStep): void;
  setPalette(palette: GlobePalette): void;
  /** Where a position is drawn, or null when it is on the far side. */
  project(position: Position): ProjectedPoint | null;
  /** Draws the globe facing `orientation` from the next frame. */
  setOrientation(orientation: GlobeOrientation): void;
  /** Asks for one more frame, as a globe in motion does to move on. */
  requestFrame(): void;
  /**
   * Called after each frame is drawn, with the time since the frame before it: 0 for the first
   * frame after a rest or after a frame not asked for by a frame listener, and never more than
   * `MaxFrameMs`.
   */
  onFrame(listener: (elapsedMs: number) => void): void;
  start(): void;
  stop(): void;
  dispose(): void;
}

/**
 * Makes the scene on `canvas`. It asks for a WebGL 2 context first, so a browser without one
 * never downloads the renderer, then imports the renderer and fetches the assets from the app's
 * own origin. It rejects with a `GlobeUnavailableError`.
 */
export async function createGlobeScene(
  canvas: HTMLCanvasElement,
  options: GlobeSceneOptions,
): Promise<GlobeScene> {
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!context) throw new GlobeUnavailableError('NoWebGL');
  let module: typeof import('./three-globe-scene');
  try {
    module = await import('./three-globe-scene');
  } catch {
    throw new GlobeUnavailableError('AssetsFailed');
  }
  return module.ThreeGlobeScene.create(canvas, context, options);
}
