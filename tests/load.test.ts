import { describe, expect, it } from 'vitest';
import fixture from './fixtures/roadmap.json';
import { loadRoadmap } from '../src/lib/roadmap';
import { LATEST_RELEASE_URL, ROADMAP_JSON_URL } from '../src/lib/links';

const TAG_URL = 'https://github.com/Night1099/WarbandTogether/releases/tag/v0.0.71';

type Route = () => Response;

function fakeFetch(routes: Record<string, Route>, calls: { url: string; init?: RequestInit }[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const route = routes[String(input)];
    if (!route) throw new Error(`unexpected fetch ${String(input)}`);
    return route();
  }) as typeof fetch;
}

const json = (status: number, body: unknown): Route => () => new Response(JSON.stringify(body), { status });
const redirect = (location?: string): Route => () =>
  new Response(null, { status: 302, headers: location ? { Location: location } : {} });

const ok = {
  [ROADMAP_JSON_URL]: json(200, fixture),
  [LATEST_RELEASE_URL]: redirect(TAG_URL),
};

describe('loadRoadmap', () => {
  it('returns the shaped model, version and build time', async () => {
    const roadmap = await loadRoadmap(fakeFetch(ok));
    expect(roadmap.version).toBe('v0.0.71');
    expect(roadmap.lanes.length).toBe(fixture.milestones.length);
    expect(roadmap.builtAt).toBeInstanceOf(Date);
  });

  it('requests the release page without following the redirect', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    await loadRoadmap(fakeFetch(ok, calls));
    const release = calls.find((c) => c.url === LATEST_RELEASE_URL);
    expect(release?.init?.redirect).toBe('manual');
  });

  it('url-decodes the tag', async () => {
    const fetchFn = fakeFetch({ ...ok, [LATEST_RELEASE_URL]: redirect('https://github.com/x/y/releases/tag/v1%2Bbeta') });
    expect((await loadRoadmap(fetchFn)).version).toBe('v1+beta');
  });

  it('fails with the URL and status when roadmap.json is missing', async () => {
    const fetchFn = fakeFetch({ ...ok, [ROADMAP_JSON_URL]: json(404, {}) });
    await expect(loadRoadmap(fetchFn)).rejects.toThrow(`${ROADMAP_JSON_URL} returned HTTP 404`);
  });

  it('fails with the URL when roadmap.json is not JSON', async () => {
    const fetchFn = fakeFetch({ ...ok, [ROADMAP_JSON_URL]: () => new Response('<html>', { status: 200 }) });
    await expect(loadRoadmap(fetchFn)).rejects.toThrow(`${ROADMAP_JSON_URL} returned invalid JSON`);
  });

  it('fails naming the URL when the release page does not redirect', async () => {
    const fetchFn = fakeFetch({ ...ok, [LATEST_RELEASE_URL]: json(200, {}) });
    await expect(loadRoadmap(fetchFn)).rejects.toThrow(`${LATEST_RELEASE_URL} returned HTTP 200, expected a redirect`);
  });

  it('fails when the redirect has no Location', async () => {
    const fetchFn = fakeFetch({ ...ok, [LATEST_RELEASE_URL]: redirect() });
    await expect(loadRoadmap(fetchFn)).rejects.toThrow(`${LATEST_RELEASE_URL} redirect has no Location header`);
  });

  it('fails when the redirect is not a release tag', async () => {
    const fetchFn = fakeFetch({ ...ok, [LATEST_RELEASE_URL]: redirect('https://github.com/Night1099/WarbandTogether') });
    await expect(loadRoadmap(fetchFn)).rejects.toThrow(`${LATEST_RELEASE_URL} redirected to a URL without /releases/tag/<tag>`);
  });
});
