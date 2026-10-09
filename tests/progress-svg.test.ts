import { describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import fixture from './fixtures/roadmap.json';
import { parseRoadmap, STATUSES } from '../src/lib/roadmap';
import { renderProgressSvg } from '../src/lib/progress-svg';

const roadmap = { ...parseRoadmap(fixture), version: 'v0.0.8' };
const parse = (svg: string) => new new Window().DOMParser().parseFromString(svg, 'image/svg+xml');

describe('renderProgressSvg', () => {
  it('states the overall count and version', () => {
    const svg = renderProgressSvg(roadmap);
    expect(svg).toContain(`${roadmap.done} of ${roadmap.total} features done`);
    expect(svg).toContain('v0.0.8');
  });

  it('draws one row per milestone with its done count', () => {
    const svg = renderProgressSvg(roadmap);
    for (const lane of roadmap.lanes) {
      expect(svg).toContain(`>${lane.name.replace('&', '&#38;')}</text>`);
      expect(svg).toContain(`>${lane.done} / ${lane.total}</text>`);
    }
  });

  it('fills each bar edge to edge', () => {
    const doc = parse(renderProgressSvg(roadmap));
    const frames = [...doc.querySelectorAll('rect.frame')].filter((r) => r.getAttribute('height') === '14');
    expect(frames).toHaveLength(roadmap.lanes.length);
    for (const frame of frames) {
      const y = frame.getAttribute('y');
      const filled = [...doc.querySelectorAll(`rect[y="${y}"]:not(.frame)`)]
        .reduce((sum, r) => sum + Number(r.getAttribute('width')), 0);
      expect(filled).toBe(Number(frame.getAttribute('width')));
    }
  });

  it('lists every status in the legend', () => {
    const svg = renderProgressSvg(roadmap);
    for (const status of STATUSES) expect(svg).toContain(`class="legend">${status}</text>`);
  });

  it('escapes markup in milestone names', () => {
    const lane = { ...roadmap.lanes[0], name: 'A <b>&</b>' };
    const svg = renderProgressSvg({ ...roadmap, lanes: [lane] });
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('A &#60;b&#62;&#38;&#60;/b&#62;');
  });
});
