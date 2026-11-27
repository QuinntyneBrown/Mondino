import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CLOCK, type Position } from '@mondino/api';
import {
  createGlobeScene,
  detailSteps,
  DiscShare,
  type GlobePalette,
  type GlobeScene,
  type ProjectedPoint,
  STARTING_ORIENTATION,
} from '../scene/globe-scene';
import { subsolarPoint } from '../sun/sun-position';
import { GlobeMotion, type GlobeOrientation } from '../motion/globe-motion';
import { GlobeGestures } from '../motion/globe-gestures';

/** Loading until the first 3D frame is drawn; Fallback where it cannot be, and the page shows the still picture. */
export type GlobeState = 'Loading' | 'Ready' | 'Fallback';

/** The teammate's own new pin: where it is and what its label says. */
export interface NewPin {
  readonly position: Position;
  readonly label: string;
}

const paletteTokens: Record<keyof GlobePalette, string> = {
  ocean: '--color-globe-ocean',
  oceanDeep: '--color-globe-ocean-deep',
  land: '--color-globe-land',
  landDeep: '--color-globe-land-deep',
  sand: '--color-globe-sand',
  ice: '--color-globe-ice',
  cloud: '--color-globe-cloud',
  night: '--color-globe-night',
};

/**
 * The 3D globe (L2-008), its night side shaded from the clock (L2-010). It draws a placeholder
 * projected into it (`[loading]`) until the first frame, and tells the page through `stateChange`
 * when the globe cannot be drawn, so the page shows the still picture in its place. Until pins
 * are built (`show-pins`), bare pins and the teammate's own new pin are plain markers over it.
 * Everything it acquires is released when it is destroyed.
 */
@Component({
  selector: 'mo-globe',
  templateUrl: './globe-view.html',
  styleUrl: './globe-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobeView {
  /** What the globe shows, for someone who cannot see it. */
  readonly label = input.required<string>();
  /** Bare pins, with no name: `null` draws no pin layer at all. */
  readonly pins = input<readonly Position[] | null>(null);
  /** The teammate's own new pin, lifted, labelled and pulsing once; or null. */
  readonly you = input<NewPin | null>(null);
  /**
   * The Globe screen's globe: it turns on its own (L2-009). A globe that is not interactive stays
   * still (ADR 0013).
   */
  readonly interactive = input(false, { transform: booleanAttribute });

  readonly stateChange = output<GlobeState>();

  /** The globe's name: an interactive globe says how it is turned, as the mocks name it. */
  protected readonly name = computed(() =>
    this.interactive() ? `${this.label()}. Drag to spin, or use the arrow keys.` : this.label(),
  );

  protected readonly state = signal<GlobeState>('Loading');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly clock = inject(CLOCK);
  private readonly releasing = new AbortController();
  private readonly scene = signal<GlobeScene | null>(null);
  /** Where the globe faces, so the markers move with it. */
  private readonly orientation = signal<GlobeOrientation>(STARTING_ORIENTATION);
  private resizing: ResizeObserver | undefined;

  /** The markers, where the scene draws their places; none on the far side. */
  protected readonly markers = computed(() => {
    const scene = this.scene();
    const pins = this.pins();
    if (!scene || this.state() !== 'Ready' || pins === null) return null;
    this.orientation();
    const placed = (position: Position) => scene.project(position);
    const you = this.you();
    const youAt = you ? placed(you.position) : null;
    return {
      pins: pins.map(placed).filter((point): point is ProjectedPoint => point !== null),
      you: you && youAt ? { ...youAt, label: you.label } : null,
    };
  });

  constructor() {
    afterNextRender(() => void this.begin());
    inject(DestroyRef).onDestroy(() => this.release());
    // The night side follows the clock: the sun moves a quarter of a degree west each minute.
    effect(() => {
      this.clock.minute();
      const scene = this.scene();
      scene?.setSun(subsolarPoint(untracked(() => this.clock.now())));
    });
  }

  private async begin(): Promise<void> {
    const { signal: released } = this.releasing;
    let scene: GlobeScene;
    try {
      // Read from the rendered view rather than through a view query, whose runtime would join
      // the initial bundle (lessons learned, journey 3).
      const canvas = this.host.querySelector('canvas');
      if (!canvas) return;
      scene = await createGlobeScene(canvas, {
        detail: detailSteps(window.devicePixelRatio || 1)[0],
        signal: released,
        onContextLost: () => this.unavailable(),
      });
    } catch {
      if (!released.aborted) this.unavailable();
      return;
    }
    if (released.aborted) {
      scene.dispose();
      return;
    }

    scene.setPalette(this.palette());
    scene.setSun(subsolarPoint(this.clock.now()));
    const box = this.host.querySelector<HTMLElement>('.globe');
    if (!box) return;
    scene.resize(box.clientWidth, box.clientHeight);
    this.resizing = new ResizeObserver(([entry]) =>
      scene.resize(entry.contentRect.width, entry.contentRect.height),
    );
    this.resizing.observe(box);
    const view = this.document.defaultView;
    view
      ?.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => scene.setPalette(this.palette()), { signal: released });
    // Nothing is drawn while the tab is hidden.
    this.document.addEventListener(
      'visibilitychange',
      () => (this.document.hidden ? scene.stop() : scene.start()),
      { signal: released },
    );
    // One frame loop turns the globe: each frame moves it on by the time the frame took, and
    // asks for the next only while it is moving (ADR 0013).
    const motion = new GlobeMotion(this.interactive(), STARTING_ORIENTATION);
    const reducedMotion = view?.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion) {
      motion.setReducedMotion(reducedMotion.matches);
      reducedMotion.addEventListener(
        'change',
        (event) => {
          motion.setReducedMotion(event.matches);
          scene.requestFrame();
        },
        { signal: released },
      );
    }
    scene.onFrame((elapsedMs) => {
      if (this.state() === 'Loading') this.moveTo('Ready');
      const before = motion.orientation;
      const after = motion.advance(elapsedMs);
      if (after !== before) {
        scene.setOrientation(after);
        this.orientation.set(after);
      } else if (motion.isMoving()) scene.requestFrame();
    });
    if (this.interactive()) {
      const turned = () => {
        scene.setOrientation(motion.orientation);
        this.orientation.set(motion.orientation);
      };
      new GlobeGestures(motion, () => (box.clientWidth / 2) * DiscShare, turned).attach(
        box,
        released,
      );
    }
    this.scene.set(scene);
    if (!this.document.hidden) scene.start();
  }

  /** The globe's colours, from the tokens on the host, so the theme decides them. */
  private palette(): GlobePalette {
    const style = getComputedStyle(this.host);
    const read = (token: string) => style.getPropertyValue(token).trim();
    return Object.fromEntries(
      Object.entries(paletteTokens).map(([part, token]) => [part, read(token)]),
    ) as unknown as GlobePalette;
  }

  private unavailable(): void {
    this.release();
    this.moveTo('Fallback');
  }

  private moveTo(state: GlobeState): void {
    if (this.state() === state) return;
    this.state.set(state);
    this.stateChange.emit(state);
  }

  private release(): void {
    this.releasing.abort();
    this.resizing?.disconnect();
    this.resizing = undefined;
    this.scene()?.dispose();
    this.scene.set(null);
  }
}
