import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * What the postal code lookup says, under the country and the postal code, in a polite live
 * region. Before anything is typed it carries the privacy promise. The lookup's other states
 * join it with the postal code lookup (journey 3).
 */
@Component({
  selector: 'mo-lookup-message',
  templateUrl: './lookup-message.html',
  styleUrl: './lookup-message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupMessage {
  /** The message's id, which the postal code field names as its description. */
  readonly messageId = input.required<string>();
}
