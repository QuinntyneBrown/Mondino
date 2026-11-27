/** Whether a teammate's clock reads ahead of the viewer's, behind it, or the same (L2-016). */
export type OffsetDirection = 'ahead' | 'behind' | 'same';

/** How far a teammate's local time is from the viewer's (L2-016). */
export interface Offset {
  /** The size of the difference in minutes, never negative: 420 for Mexico City seen from Milan. */
  readonly minutes: number;
  readonly direction: OffsetDirection;
}
