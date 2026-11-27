// Traces to: L2-017
import { firstName } from './first-name';

describe('firstName', () => {
  const cases: [string, string][] = [
    ['Tomás Herrera', 'Tomás'],
    ['  Noah   Williams ', 'Noah'],
    ['Madonna', 'Madonna'],
    ['<b>Bold</b> name', '<b>Bold</b>'],
  ];
  for (const [name, first] of cases)
    it(`gives "${first}" for "${name}"`, () => expect(firstName(name)).toBe(first));
});
