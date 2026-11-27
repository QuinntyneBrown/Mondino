import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The icons a notice can carry: a broken link, no connection, a full team, or a mail sent. */
export type NoticeIcon = 'link-off' | 'offline' | 'users' | 'mail-check';

/**
 * A notice that takes a form's place: an icon, a title, a line and a way on. The title is the
 * screen's heading. The line is `text`, then `emphasis` in strong, then `rest`; all are rendered as
 * text. The way on is projected into `actions`. A notice that reports something that just happened
 * ("Check your inbox") is `status`: announced, with a title that takes focus from script.
 */
@Component({
  selector: 'mo-notice',
  templateUrl: './notice.html',
  styleUrl: './notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notice {
  readonly icon = input.required<NoticeIcon>();
  readonly title = input.required<string>();
  readonly text = input.required<string>();
  /** Shown in strong after `text`: an email, as text. */
  readonly emphasis = input('');
  readonly rest = input('');
  /** Announces the notice (`role="status"`) and lets its title take focus. */
  readonly status = input(false, { transform: booleanAttribute });
  /** The title's id, so the screen can move focus to it. */
  readonly titleId = input<string | null>(null);
}
