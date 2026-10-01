import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import DetailCard from '../src/components/DetailCard.astro';
import Block from '../src/components/Block.astro';
import MilestoneLane from '../src/components/MilestoneLane.astro';
import Header from '../src/components/Header.astro';
import Legend from '../src/components/Legend.astro';
import { STATUSES, type Feature, type Lane } from '../src/lib/roadmap';
import { LATEST_RELEASE_URL, REPO_URL } from '../src/lib/links';

const feature: Feature = {
  id: 'arena', name: 'Arena <b>&amp;</b> "pits"', group: 'Towns', status: 'Known issue', note: 'Use <i>care</i>',
};
const render = async (component: any, props: Record<string, unknown> = {}) =>
  (await AstroContainer.create()).renderToString(component, { props });

describe('Block', () => {
  it('renders a status-coloured button carrying the feature fields', async () => {
    const html = await render(Block, { feature });
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('status-known-issue');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-status="Known issue"');
    expect(html).toContain('data-group="Towns"');
  });

  it('escapes markup in the name and note', async () => {
    const html = await render(Block, { feature });
    // Astro leaves "<" literal inside quoted attribute values (harmless), so
    // assert on the parsed DOM: no injected elements, values round-trip intact.
    const doc = new new Window().DOMParser().parseFromString(html, 'text/html');
    expect(doc.body.querySelectorAll('b, i')).toHaveLength(0);
    const button = doc.body.querySelector('button')!;
    expect(doc.body.children).toHaveLength(1);
    expect(button.getAttribute('data-name')).toBe(feature.name);
    expect(button.getAttribute('data-note')).toBe(feature.note);
  });

  it('escapes markup in text contexts', async () => {
    const lane: Lane = {
      id: 'x', name: 'Lane <b>x</b>', summary: 'S <i>y</i>', done: 0, total: 1,
      groups: [{ name: 'Group <b>g</b>', features: [feature] }],
    };
    const html = await render(MilestoneLane, { lane });
    expect(html).not.toContain('<b>x</b>');
    expect(html).not.toContain('<i>y</i>');
    expect(html).not.toContain('<b>g</b>');
    expect(html).toContain('Lane &lt;b&gt;x&lt;/b&gt;');
  });
});

describe('MilestoneLane', () => {
  const lane: Lane = {
    id: 'adventurer', name: 'Adventurer', summary: 'Travel and fight.', done: 3, total: 7,
    groups: [{ name: 'Towns', features: [feature] }],
  };

  it('renders heading, count, summary, cluster label and one card', async () => {
    const html = await render(MilestoneLane, { lane });
    expect(html).toContain('class="lane"');
    expect(html).toContain('Adventurer');
    expect(html).toContain('3 / 7 done');
    expect(html).toContain('Travel and fight.');
    expect(html).toContain('Towns');
    expect(html.match(/class="detail-card"/g)?.length).toBe(1);
  });

  it('separates the lane name from the count in the heading text', async () => {
    const html = await render(MilestoneLane, { lane });
    const doc = new new Window().DOMParser().parseFromString(html, 'text/html');
    expect(doc.body.querySelector('h2')!.textContent).toBe('Adventurer 3 / 7 done');
  });

  it('renders an empty milestone without clusters', async () => {
    const html = await render(MilestoneLane, { lane: { ...lane, done: 0, total: 0, groups: [] } });
    expect(html).toContain('0 / 0 done');
    expect(html).not.toContain('class="block');
  });
});

describe('DetailCard', () => {
  it('announces its content politely', async () => {
    const html = await render(DetailCard);
    const doc = new new Window().DOMParser().parseFromString(html, 'text/html');
    expect(doc.body.querySelector('.detail-card')!.getAttribute('aria-live')).toBe('polite');
  });
});

describe('Header and Legend', () => {
  it('shows title, version and both links', async () => {
    const html = await render(Header, { version: 'v0.0.71' });
    expect(html).toContain('Warband Together');
    expect(html).toContain('v0.0.71');
    expect(html).toContain(LATEST_RELEASE_URL);
    expect(html).toContain(REPO_URL);
  });

  it('names every status', async () => {
    const html = await render(Legend);
    STATUSES.forEach((s) => expect(html).toContain(s));
  });
});
