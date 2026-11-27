import type { Status } from '../time/status';

/** Which side of its pin a label sits on. */
export type LabelSide = 'right' | 'left' | 'below' | 'above';

/** What one pin shows, worked out once a minute rather than on each frame (ADR 0014). */
export interface PinView {
  readonly teammateId: string;
  /** The first character of up to the first two words of the name; never blank. */
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
  /** The name as it is shown, with "(you)" after the viewer's own. */
  readonly name: string;
  readonly cityName: string;
  /** The local time on the viewer's clock: "15:05", or "3:05 pm". */
  readonly localTime: string;
  /** The status at the local time, or null when the teammate does not share it. */
  readonly status: Status | null;
  /** The pin's accessible name: "Tomás Herrera, Mexico City, 08:05, Early morning". */
  readonly description: string;
  readonly isViewer: boolean;
  /** Placed just now: it pulses once. */
  readonly isNew: boolean;
}

/** One thing drawn over the globe: a pin alone, or a group pin with a count. */
export interface PinPlacement {
  /** The teammate id of a pin; "group:" and its anchor's teammate id for a group pin. */
  readonly key: string;
  readonly kind: 'pin' | 'group';
  /** Where it is drawn, in % of the globe's box. */
  readonly x: number;
  readonly y: number;
  /** 1 facing the viewer, falling towards 0 at the rim. */
  readonly depth: number;
  /** Near the rim: drawn fainter and without its label until it is lifted. */
  readonly far: boolean;
  /** The pins it stands for: one for a pin, two or more for a group pin. */
  readonly pins: readonly PinView[];
  /** Its accessible name. */
  readonly description: string;
  /** The side its label sits on at rest, or null when it shows none until it is lifted. */
  readonly labelSide: LabelSide | null;
}
