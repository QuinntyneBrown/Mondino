# Security policy

The security of Mondino and of the people who use it matters. Mondino holds
teammates' names and postal codes, and shows each team where its people are, what time it is
there and when they are probably asleep. We treat every report seriously.

## Supported versions

Mondino is under active development and has no released versions yet. Security fixes are made on
the `main` branch only.

| Version | Supported |
|---|---|
| `main` | Yes |
| Anything else | No |

## Reporting a vulnerability

**Do not report a security vulnerability in a public GitHub issue, discussion or pull request.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/QuinntyneBrown/Mondino/security/advisories/new)
for this repository. If that is not available to you, contact the repository owner privately
through their [GitHub profile](https://github.com/QuinntyneBrown).

Include as much of the following as you can:

- the kind of issue (for example, learning a teammate's postal code or a position more precise than
  their city, seeing a team you have not joined, changing or removing another teammate's pin, a
  Content-Security-Policy bypass, injection or cross-site scripting);
- the affected page, endpoint or source file, with the branch or commit;
- the steps to reproduce it, and the browser and host it needs;
- a proof of concept, if you have one;
- the impact, and how an attacker could use it.

## What to expect

- We acknowledge a report within **three business days**.
- We confirm or rule out the issue and share an expected timeline within **ten business days**.
- We keep you informed until it is fixed, and credit you in the advisory unless you would rather
  stay anonymous.

Please give us reasonable time to fix an issue before you disclose it publicly.

## Scope

In scope: the code in this repository, the app and its backend, and anything that lets someone see a team they are not in,
change what belongs to another teammate, or learn a teammate's postal code or precise location.

Out of scope: denial-of-service testing, social engineering, physical attacks, and findings in
third-party dependencies that are already publicly known (report those to the dependency's
maintainers).

Test only against your own copy of Mondino and teams you made yourself, and never
join or look up a team of people you do not know.
