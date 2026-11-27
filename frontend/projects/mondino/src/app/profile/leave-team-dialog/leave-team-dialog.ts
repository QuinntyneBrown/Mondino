import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Button } from '@mondino/components';
import { TeamStore } from '../../team/team-store';
import { ProfileStore } from '../profile-store';
import { leaveTeamText } from './leave-team-text';

/** The ids the CDK container names and describes the dialog by. */
export const leaveTeamTitleId = 'leave-team-title';
export const leaveTeamDescriptionId = 'leave-team-description';

/**
 * "Leave Northwind?" (L2-036), opened by "Leave Northwind" on Profile & Settings, whose CDK Dialog
 * makes it an alert dialog with focus on "Stay". It names the team and how many teammates see the
 * pin. "Stay" and Escape close it and nothing changes. The team's name is rendered as text.
 */
@Component({
  selector: 'mo-leave-team-dialog',
  imports: [Button],
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
  protected readonly text = computed(() => {
    const pins = this.team.team()?.pins;
    return leaveTeamText(pins ? pins.filter((pin) => !pin.isViewer).length : null);
  });
}
