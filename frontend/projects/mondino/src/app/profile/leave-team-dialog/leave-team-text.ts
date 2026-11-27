/**
 * What "Leave Northwind?" says will go (L2-036): "for all 12 teammates" with others on the team,
 * "for your 1 teammate" with one, and the team's globe with none or when the team is not read.
 */
export function leaveTeamText(others: number | null): string {
  const comeBack = 'To come back you’ll need the team’s invite link.';
  if (others === null || others < 1)
    return `Your pin comes off the team’s globe, along with your weather and moments. ${comeBack}`;
  const whom = others === 1 ? 'your 1 teammate' : `all ${others} teammates`;
  return `Your pin comes off the globe for ${whom}, along with your weather and moments. ${comeBack}`;
}
