import { describe, expect, it } from 'vitest';
import fixture from './fixtures/roadmap.json';
import { parseRoadmap, statusSlug, STATUSES } from '../src/lib/roadmap';

const clone = () => structuredClone(fixture) as any;

describe('parseRoadmap on the real fixture', () => {
  const model = parseRoadmap(fixture);

  it('keeps milestones in file order as lanes', () => {
    expect(model.lanes.map((l) => l.id)).toEqual(fixture.milestones.map((m) => m.id));
  });

  it('uses milestone done/total as given and sums them', () => {
    model.lanes.forEach((lane, i) => {
      expect(lane.done).toBe(fixture.milestones[i].done);
      expect(lane.total).toBe(fixture.milestones[i].total);
    });
    expect(model.done).toBe(fixture.milestones.reduce((s, m) => s + m.done, 0));
    expect(model.total).toBe(fixture.milestones.reduce((s, m) => s + m.total, 0));
  });

  it('excludes features with no milestone', () => {
    const shown = model.lanes.flatMap((l) => l.groups.flatMap((g) => g.features.map((f) => f.id)));
    const nullIds = fixture.features.filter((f) => f.milestone === null).map((f) => f.id);
    expect(nullIds.length).toBeGreaterThan(0);
    nullIds.forEach((id) => expect(shown).not.toContain(id));
    expect(shown.length).toBe(fixture.features.length - nullIds.length);
  });

  it('orders groups alphabetically within a lane', () => {
    for (const lane of model.lanes) {
      const names = lane.groups.map((g) => g.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('sorts features by status order, then name', () => {
    for (const lane of model.lanes) {
      for (const group of lane.groups) {
        const keys = group.features.map((f) => [STATUSES.indexOf(f.status), f.name] as const);
        const sorted = [...keys].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
        expect(keys).toEqual(sorted);
      }
    }
  });
});

describe('parseRoadmap shaping edge cases', () => {
  it('keeps an empty milestone as an empty lane', () => {
    const raw = clone();
    raw.milestones.push({ id: 'empty', name: 'Empty', summary: 's', done: 0, total: 0 });
    const lane = parseRoadmap(raw).lanes.at(-1)!;
    expect(lane).toMatchObject({ id: 'empty', done: 0, total: 0, groups: [] });
  });

  it('ignores unknown extra fields', () => {
    const raw = clone();
    raw.extra = true;
    raw.features[0].extra = 'x';
    expect(() => parseRoadmap(raw)).not.toThrow();
  });

  it('turns a missing note into an empty string', () => {
    const raw = clone();
    delete raw.features[0].note;
    const all = parseRoadmap(raw).lanes.flatMap((l) => l.groups.flatMap((g) => g.features));
    expect(all.find((f) => f.id === raw.features[0].id)?.note).toBe('');
  });
});

describe('parseRoadmap rejects bad input', () => {
  it('rejects a schema_version other than 1', () => {
    const raw = clone();
    raw.schema_version = 2;
    expect(() => parseRoadmap(raw)).toThrow(/schema_version 2/);
  });

  it('rejects an unknown status, naming it', () => {
    const raw = clone();
    raw.features[0].status = 'Shipped';
    expect(() => parseRoadmap(raw)).toThrow(/unknown status "Shipped"/);
  });

  it('rejects an unknown milestone id, naming it', () => {
    const raw = clone();
    raw.features[0].milestone = 'emperor';
    expect(() => parseRoadmap(raw)).toThrow(/unknown milestone "emperor"/);
  });

  it('rejects a feature without a name', () => {
    const raw = clone();
    delete raw.features[0].name;
    expect(() => parseRoadmap(raw)).toThrow(/name/);
  });

  it('rejects a non-object', () => {
    expect(() => parseRoadmap(null)).toThrow();
  });
});

describe('statusSlug', () => {
  it('kebab-cases every status', () => {
    expect(STATUSES.map(statusSlug)).toEqual([
      'works', 'in-testing', 'partly-works', 'known-issue', 'planned', 'not-yet-assessed', 'not-in-coop',
    ]);
  });
});
