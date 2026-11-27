// 00 · Meet Mondino: every feature mondino.world serves, in eighteen scenes on the 92.99 BPM grid
// of Beautiful Boom Bap (a bar is 2.58 s): the question, the problem, meet, Create Team, Join, only
// the city, Sign In, the globe, pins, a teammate's panel, status, who is working, Team, a team of
// hundreds, the invite link, every screen, what comes next, and the close with what Mondino is.
// Every position is a pure function of scene time (docs/videos/README.md).
const { enter, ease, prog, esc } = Film;
const { at, part, onBeat, onPhone, onBrowser, closeup, pop, fact, counter, lockup, opening, closing, wipeInto, zoomOut, zoomIn, bug } = Film.kit;

/** The beat at or after the fraction `f` of line `n` of scene `id`. */
const beatOf = (S, id, f, n = 0) => onBeat(S, part(id, n, f));

const title = (S, kicker, words, accent, x, y, w, size = 'headline--md') => `
  <div style="${at(x, y, w)}">
    <p class="kicker" ${S.rise(S.beat(1))}>${esc(kicker)}</p>
    <h1 class="headline ${size}" style="margin-top:20px">${S.words(S.beat(2), words, { accent })}</h1>
  </div>`;

const pill = (S, when, label, x, y) =>
  `<div class="pill" style="left:${x}px;top:${y}px" ${S.rise(when, { y: 14, dur: 0.25 })}>${esc(label)}</div>`;

/** Two states of one screen in the same browser window: `first` until `swap`, then `second`. */
const twoStates = (S, first, second, x, y, w, when, swap, tilt = 0) =>
  onBrowser(S, first, x, y, w, when, { tilt, show: (t) => t < swap }) +
  onBrowser(S, second, x, y, w, when, { tilt, show: (t) => t >= swap });

// ── Act 1: a team spread around the world ─────────────────────────────────────────────────────
opening('hook', {
  kicker: 'A team spread around the world',
  words: 'What is it like',
  accent: 'there, right now?',
  width: 900,
  device: (S) => onBrowser(S, 'globe-xl', 1010, 300, 1000, S.beat(3), { tilt: 2 }),
});

Film.scene('problem', (S) => {
  const dull = (n, f, text) => fact(S, n, beatOf(S, 'problem', f), `<span class="mono">${text}</span>`);
  return `
  <div class="fill field--ink"><div class="grid-lines"></div>
  ${title(S, 'The team list', 'Names and time zones', 'tell you nothing.', 110, 160, 950)}
  <div style="${at(1160, 250, 640)}">
    ${dull(1, 0.05, 'Tomás · UTC−6')}
    ${dull(2, 0.25, 'Sofia · UTC+1')}
    ${dull(3, 0.45, 'Noah · UTC+11')}
  </div>
  <p class="lede" style="${at(110, 850, 1100)}" ${S.rise(beatOf(S, 'problem', 0.55))}>Morning there? Raining? Asleep?</p>
  </div>`;
});

// ── Act 2: meet Mondino, and three ways in ────────────────────────────────────────────────────
Film.scene('meet', (S) => `
  <div class="fill field--pin">
  <div style="${at(110, 290, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Meet</p>
    <div style="margin-top:36px" ${S.rise(S.beat(1), { y: 40 })}>${lockup(150)}</div>
    <p class="lede" style="margin-top:56px;font-weight:700" ${S.rise(beatOf(S, 'meet', 0.3))}>Your team, around the world,<br>right now.</p>
  </div>
  ${onPhone(S, 'globe-xs', 1300, 110, 430, beatOf(S, 'meet', 0.25), 4)}
  </div>`, { before: 0.3 });

Film.scene('create', (S) => `
  <div class="fill field--paper"><div class="grid-lines"></div>
  ${title(S, 'Create Team', 'Start a team.', 'In a minute.', 90, 110, 760, 'headline--sm')}
  <div style="${at(90, 480, 640)}">
    ${fact(S, 1, beatOf(S, 'create', 0.3), 'A team name and your name')}
    ${fact(S, 2, beatOf(S, 'create', 0.6), 'A work email, a country, a postal code')}
    ${fact(S, 3, beatOf(S, 'create', 0.2, 1), 'An invite link for everyone')}
  </div>
  ${twoStates(S, 'create-xl', 'created-xl', 800, 190, 1040, beatOf(S, 'create', 0.1), beatOf(S, 'create', 0, 1), 1)}
  </div>`);

Film.scene('join', (S) => {
  const joined = beatOf(S, 'join', 0.9, 1);
  return `
  <div class="fill field--ink"><div class="grid-lines"></div>
  ${title(S, 'Join', 'Put yourself', 'on the map.', 1180, 110, 700, 'headline--sm')}
  <div style="${at(1180, 480, 650)}">
    ${fact(S, 1, beatOf(S, 'join', 0.5), 'The team, already on the globe')}
    ${fact(S, 2, beatOf(S, 'join', 0.25, 1), 'A postal code finds the city')}
    ${fact(S, 3, beatOf(S, 'join', 0.55, 1), 'And the weather there')}
  </div>
  ${twoStates(S, 'join-empty-xl', 'join-xl', 80, 190, 1040, beatOf(S, 'join', 0.1), beatOf(S, 'join', 0.1, 1), -1)}
  ${pill(S, joined, 'Join Northwind', 420, 880)}
  ${S.confetti([joined], { count: 150 })}
  </div>`;
});

Film.scene('private', (S) => `
  <div class="fill field--sun">
  ${title(S, 'City level, and no more', 'Only the city', 'is shown.', 110, 150, 1000)}
  <div style="${at(110, 560, 780)}">
    ${fact(S, 1, beatOf(S, 'private', 0.1), 'Enough to tell Mississauga from Toronto')}
    ${fact(S, 2, beatOf(S, 'private', 0.45), 'The postal code stays private')}
    ${fact(S, 3, beatOf(S, 'private', 0.75), 'Never an address')}
  </div>
  ${onPhone(S, 'join-xs', 1260, 100, 440, S.beat(2), 3)}
  </div>`);

Film.scene('signin', (S) => `
  <div class="fill field--ink" ${zoomOut(S, 1340, 560)}><div class="grid-lines"></div>
  ${title(S, 'Sign In', 'Welcome back.', 'No password.', 90, 110, 760, 'headline--sm')}
  <div style="${at(90, 480, 640)}">
    ${fact(S, 1, beatOf(S, 'signin', 0.45), 'A link, by email')}
    ${fact(S, 2, beatOf(S, 'signin', 0.75), 'It works once')}
    ${fact(S, 3, beatOf(S, 'signin', 0.88), 'Within 15 minutes')}
  </div>
  ${twoStates(S, 'sign-in-xl', 'sign-in-sent-xl', 800, 190, 1040, beatOf(S, 'signin', 0.05), beatOf(S, 'signin', 0.5), 1)}
  </div>`, { after: 0.7 });

// ── Act 3: the globe, its pins and the panel beside it ────────────────────────────────────────
Film.scene('globe', (S) => `
  <div class="fill field--night" ${zoomIn(S)}>
  ${title(S, 'Globe · the home screen', 'Lit, shaded,', 'and turning.', 90, 110, 700, 'headline--sm')}
  <p class="lede" style="${at(90, 520, 600)}" ${S.rise(beatOf(S, 'globe', 0.35))}>A 3D globe with every teammate’s pin on it.</p>
  ${onBrowser(S, 'globe-dark-xl', 760, 150, 1100, S.beat(2), { tilt: 1 })}
  ${pill(S, beatOf(S, 'globe', 0.75), 'Night side in dusk', 800, 900)}
  ${pill(S, beatOf(S, 'globe', 0.6, 1), 'Drag to spin', 1130, 900)}
  </div>`, { before: 0.7 });

Film.scene('pins', (S) => `
  <div class="fill field--paper"><div class="grid-lines"></div>
  ${title(S, 'A pin is', 'A person, a clock', 'and a sky.', 90, 110, 760, 'headline--sm')}
  <div style="${at(90, 480, 640)}">
    ${fact(S, 1, beatOf(S, 'pins', 0.5), 'Initials in their own colour')}
    ${fact(S, 2, beatOf(S, 'pins', 0.7), 'Local time')}
    ${fact(S, 3, beatOf(S, 'pins', 0.85), 'Weather and temperature')}
  </div>
  ${onBrowser(S, 'group-xl', 880, 190, 980, beatOf(S, 'pins', 0.1), { tilt: -1 })}
  ${closeup('group-panel', `${at(1400, 700, 460)};height:290px;object-fit:cover;object-position:top`, pop(S, beatOf(S, 'pins', 0.2, 1), { tilt: 2 }))}
  </div>`);

Film.scene('panel', (S) => `
  <div class="fill field--ink"><div class="grid-lines"></div>
  ${title(S, 'A teammate’s panel', 'Select a pin.', 'Meet them.', 90, 60, 1200, 'headline--sm')}
  ${onBrowser(S, 'selected-xl', 90, 330, 1060, beatOf(S, 'panel', 0.1), { tilt: -1 })}
  ${closeup('selected-panel', `${at(1330, 150, 460)};height:640px;object-fit:cover;object-position:top`, pop(S, beatOf(S, 'panel', 0.05, 1), { tilt: 1.5 }))}
  ${pill(S, beatOf(S, 'panel', 0.45, 1), '7h behind you', 90, 232)}
  ${pill(S, beatOf(S, 'panel', 0.3, 2), 'Shared: 16:00–18:00 on your clock', 330, 232)}
  </div>`);

Film.scene('status', (S) => {
  const row = (n, f, name, hours) => fact(S, n, beatOf(S, 'status', f), `<span>${name}<small>${hours}</small></span>`);
  return `
  <div class="fill field--paper"><div class="grid-lines"></div>
  ${title(S, 'Status', 'From the', 'local hour.', 90, 90, 900, 'headline--sm')}
  <div style="${at(90, 400, 700)}">
    ${row(1, 0.3, 'Early morning', '07:00 to 09:00')}
    ${row(2, 0.45, 'Working hours', '09:00 to 18:00')}
    ${row(3, 0.58, 'Evening', '18:00 to 23:00')}
    ${row(4, 0.7, 'Probably asleep', '23:00 to 07:00')}
  </div>
  ${closeup('selected-asleep-panel', `${at(1000, 150, 440)};height:700px;object-fit:cover;object-position:top`, pop(S, S.beat(3), { tilt: -1.5 }))}
  <p class="lede" style="${at(1520, 440, 380)};font-weight:700" ${S.rise(beatOf(S, 'status', 0.85))}>No tracking.<br>Just the clock.</p>
  </div>`;
});

Film.scene('week', (S) => `
  <div class="fill field--ocean">
  ${title(S, 'With no pin selected', 'Who is working', 'right now?', 90, 90, 1000, 'headline--sm')}
  ${counter(S, [
    [beatOf(S, 'week', 0.3), '13'],
    [beatOf(S, 'week', 0.45), '12'],
    [beatOf(S, 'week', 0.75), '8'],
  ], `${at(90, 420, 620)};text-align:center`)}
  <p class="lede" style="${at(90, 760, 620)};text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = enter(t, beatOf(S, 'week', 0.3), 0.3);
    el.textContent = t < beatOf(S, 'week', 0.45) ? 'teammates' : t < beatOf(S, 'week', 0.75) ? 'time zones' : 'in working hours now';
  })}></p>
  ${onBrowser(S, 'globe-xl', 720, 360, 700, S.beat(2), { tilt: -1 })}
  ${closeup('week-panel', `${at(1440, 150, 400)};height:520px;object-fit:cover;object-position:top`, pop(S, beatOf(S, 'week', 0.6), { tilt: 1.5 }))}
  </div>`, { before: 0.3 });

Film.scene('team', (S) => `
  <div class="fill field--paper"><div class="grid-lines"></div>
  ${title(S, 'Team', 'Everyone,', 'through their day.', 90, 70, 800, 'headline--sm')}
  ${onBrowser(S, 'team-xl', 90, 420, 900, beatOf(S, 'team', 0.1), { tilt: -1 })}
  ${closeup('team-ribbon', at(1040, 110, 800), pop(S, beatOf(S, 'team', 0.55), { tilt: 1 }))}
  ${onPhone(S, 'team-xs', 1500, 420, 320, beatOf(S, 'team', 0.05, 1), 3)}
  ${pill(S, beatOf(S, 'team', 0.3, 1), 'West to east', 1060, 560)}
  ${pill(S, beatOf(S, 'team', 0.6, 1), 'All · Working now · Asleep', 1060, 650)}
  </div>`);

Film.scene('large', (S) => `
  <div class="fill field--ink"><div class="grid-lines"></div>
  ${title(S, 'A large team', 'Hundreds,', 'still readable.', 90, 110, 760, 'headline--sm')}
  ${counter(S, [[beatOf(S, 'large', 0.3), '500']], `${at(90, 520, 640)};font-size:260px;color:var(--palette-pin-dark)`)}
  <p class="lede" style="${at(90, 800, 640)}" ${S.rise(beatOf(S, 'large', 0.6))}>Group pins, each with a count.</p>
  ${onBrowser(S, 'hundreds-xl', 800, 170, 1040, beatOf(S, 'large', 0.15), { tilt: 1 })}
  </div>`);

Film.scene('invite', (S) => `
  <div class="fill field--pin">
  ${title(S, 'Invite teammate', 'Bring', 'everyone in.', 90, 110, 800)}
  <div style="${at(90, 520, 640)}">
    ${fact(S, 1, beatOf(S, 'invite', 0.3), 'The team’s invite link')}
    ${fact(S, 2, beatOf(S, 'invite', 0.5), 'One button to copy it')}
    ${fact(S, 3, beatOf(S, 'invite', 0.8), 'No admins, no roles')}
  </div>
  ${closeup('invite-panel', at(840, 330, 640), pop(S, beatOf(S, 'invite', 0.1), { tilt: -1.5 }))}
  ${onPhone(S, 'invite-xs', 1500, 150, 360, beatOf(S, 'invite', 0.4), 3)}
  </div>`, { before: 0.3 });

Film.scene('everywhere', (S) => {
  const shots = [['xs', 390, 780], ['m', 768, 1024], ['l', 1024, 768], ['xl', 1440, 900], ['dark-xl', 1440, 900]]
    .map(([s, width, height]) => ({ src: `shots/globe-${s}.png`, width, height }));
  const dark = beatOf(S, 'everywhere', 0.8);
  return `
  <div class="fill field--paper">
  <h1 class="headline headline--sm" style="position:absolute;left:0;right:0;top:50px;text-align:center">${S.words(S.beat(1), 'Every screen,', { accent: 'light and dark.' })}</h1>
  ${S.grow(shots, (t) => 3 * ease.inOut(prog(t, S.beat(2), Math.max(1, dark - 0.6 - S.beat(2)))) + ease.inOut(prog(t, dark - 0.3, 0.6)), { height: 720, style: 'position:absolute;left:0;right:0;top:200px' })}
  <p class="lede" style="position:absolute;left:0;right:0;top:960px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = enter(t, S.beat(3), 0.3);
    el.textContent = t < dark ? 'A phone, a tablet, a desktop, a large screen.' : 'In light and in dark.';
  })}></p>
  </div>`;
});

// ── Act 4: what comes next, and what Mondino is ───────────────────────────────────────────────
Film.scene('next', (S) => {
  const row = (n, f, name, what) => fact(S, n, beatOf(S, 'next', f), `<span>${name}<small>${what}</small></span>`);
  return `
  <div class="fill field--sun">
  ${title(S, 'Not on mondino.world yet', 'Coming', 'next.', 110, 150, 800)}
  <div style="${at(960, 230, 850)}">
    ${row(1, 0.15, 'Moments', 'Holidays, races and local events')}
    ${row(2, 0.7, 'Profile &amp; Settings', 'Your pin, °C or °F, what teammates see')}
  </div>
  </div>`;
}, { before: 0.3 });

closing('close', { kicker: 'Your team, around the world, right now.', after: 1 });

wipeInto('meet', 'var(--palette-paper)');
wipeInto('week', 'var(--palette-sun)');
wipeInto('invite', 'var(--palette-ink)');
wipeInto('next', 'var(--palette-ink)');
bug();

Film.start();
