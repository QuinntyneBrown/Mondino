// Traces to: L2-036
import { leaveTeamText } from './leave-team-text';

describe('leaveTeamText', () => {
  it('names how many other teammates see the pin', () => {
    expect(leaveTeamText(12)).toBe(
      'Your pin comes off the globe for all 12 teammates, along with your weather and moments. To come back you’ll need the team’s invite link.',
    );
  });

  it('names one teammate as one', () => {
    expect(leaveTeamText(1)).toBe(
      'Your pin comes off the globe for your 1 teammate, along with your weather and moments. To come back you’ll need the team’s invite link.',
    );
  });

  it('speaks of the team’s globe with no other teammate, or none read', () => {
    const alone =
      'Your pin comes off the team’s globe, along with your weather and moments. To come back you’ll need the team’s invite link.';
    expect(leaveTeamText(0)).toBe(alone);
    expect(leaveTeamText(null)).toBe(alone);
  });
});
