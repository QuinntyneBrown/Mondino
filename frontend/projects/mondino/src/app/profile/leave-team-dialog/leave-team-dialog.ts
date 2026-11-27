import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Alert, Button } from '@mondino/components';
import { TeamStore } from '../../team/team-store';
import { ProfileStore } from '../profile-store';
import { leaveTeamText } from './leave-team-text';

/** The ids the CDK container names and describes the dialog by. */
export const leaveTeamTitleId = 'leave-team-title';
export const leaveTeamDescriptionId = 'leave-team-description';

/**
 * "Leave Northwind?" (L2-036), opened by "Leave Northwind" on Profile & Settings, whose CDK Dialog
 * makes it an alert dialog with focus on "Stay". It names the team and how many teammates see the
 * pin. "Stay" and Escape close it and nothing changes. While leaving is answered both buttons are
 * disabled and Escape does nothing; a failure is said in an alert, with focus on "Try again". The
 * team's name is rendered as text.
 */
@Component({
  selector: 'mo-leave-team-dialog',
  imports: [Alert, Button],
  templateUrl: './leave-team-dialog.html',
  styleUrl: './leave-team-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveTeamDialog {
  protected readonly dialog = inject(DialogRef);
  protected readonly store = inject(ProfileStore);
  private readonly team = inject(TeamStore);
  protected readonly titleId = leaveTeamTitleId;
  protected readonly descriptionId = leaveTeamDescriptionId;

  protected readonly teamName = computed(() => this.store.profile()?.teamName ?? '');
  protected readonly title = computed(() => `Leave ${this.teamName()}?`);
  protected readonly action = computed(() => `Leave ${this.teamName()}`);
  protected readonly failure = computed(
    () => `We couldn’t take your pin off. You’re still on ${this.teamName()} — try again.`,
  );
  protected readonly text = computed(() => {
    const pins = this.team.team()?.pins;
    return leaveTeamText(pins ? pins.filter((pin) => !pin.isViewer).length : null);
  });

  private readonly retry = viewChild<string, ElementRef<HTMLElement>>('retry', {
    read: ElementRef,
  });

  constructor() {
    // Escape and the CDK's own close do nothing while leaving is answered.
    effect(() => (this.dialog.disableClose = this.store.leaving()));
    // "Try again" takes focus when it appears.
    effect(() => this.retry()?.nativeElement.focus());
  }
}
