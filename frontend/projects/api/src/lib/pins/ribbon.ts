/** A teammate on the day ribbon (L2-027): at the hour they are living through, in a row of its own. */
export interface RibbonMarker {
  readonly teammateId: string;
  readonly name: string;
  readonly initials: string;
  /** A teammate colour of the palette: `teammate-1` to `teammate-13`. */
  readonly colour: string;
  readonly cityName: string;
  /** On the viewer's clock: "08:05", or "8:05 am". */
  readonly localTime: string;
  /** The local hour and minute as a percentage of 24 hours, to two decimals: 08:05 is 33.68. */
  readonly at: number;
  /** The row it sits in, from 0, so markers near one another are each visible. */
  readonly lane: number;
}

/** The ribbon's markers, in the order a screen reader reads them, and the rows they need. */
export interface RibbonView {
  readonly markers: readonly RibbonMarker[];
  readonly rows: number;
}
