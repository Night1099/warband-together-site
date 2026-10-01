import { LATEST_RELEASE_URL, ROADMAP_JSON_URL } from './links';

export const STATUSES = [
  'Works',
  'In testing',
  'Partly works',
  'Known issue',
  'Planned',
  'Not yet assessed',
  'Not in coop',
] as const;

export type Status = (typeof STATUSES)[number];

export interface Feature {
  id: string;
  name: string;
  group: string;
  status: Status;
  note: string;
}

export interface GroupCluster {
  name: string;
  features: Feature[];
}

export interface Lane {
  id: string;
  name: string;
  summary: string;
  done: number;
  total: number;
  groups: GroupCluster[];
}

export interface RoadmapModel {
  lanes: Lane[];
  done: number;
  total: number;
}

type Json = Record<string, unknown>;

function field<T>(obj: Json, key: string, type: 'string' | 'number', where: string): T {
  const value = obj[key];
  if (typeof value !== type) throw new Error(`roadmap.json: ${where} has no ${type} "${key}"`);
  return value as T;
}

function isStatus(value: unknown): value is Status {
  return (STATUSES as readonly unknown[]).includes(value);
}

export function statusSlug(status: Status): string {
  return status.toLowerCase().replaceAll(' ', '-');
}

/**
 * Validates a parsed roadmap.json (schema_version 1) and shapes it into lanes.
 *
 * Throws on a wrong schema_version, an unknown status, a feature pointing at an
 * unknown milestone, or a missing required field, so a bad upstream file fails
 * the build instead of rendering wrong.
 */
export function parseRoadmap(raw: unknown): RoadmapModel {
  if (typeof raw !== 'object' || raw === null) throw new Error('roadmap.json: not an object');
  const root = raw as Json;
  if (root.schema_version !== 1) {
    throw new Error(`roadmap.json: unsupported schema_version ${String(root.schema_version)}`);
  }
  if (!Array.isArray(root.milestones) || !Array.isArray(root.features)) {
    throw new Error('roadmap.json: missing milestones or features array');
  }

  const lanes: Lane[] = (root.milestones as Json[]).map((m, i) => ({
    id: field<string>(m, 'id', 'string', `milestone ${i}`),
    name: field<string>(m, 'name', 'string', `milestone ${i}`),
    summary: field<string>(m, 'summary', 'string', `milestone ${i}`),
    done: field<number>(m, 'done', 'number', `milestone ${i}`),
    total: field<number>(m, 'total', 'number', `milestone ${i}`),
    groups: [],
  }));
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));

  for (const [i, f] of (root.features as Json[]).entries()) {
    const id = field<string>(f, 'id', 'string', `feature ${i}`);
    const where = `feature "${id}"`;
    const status = f.status;
    if (!isStatus(status)) throw new Error(`roadmap.json: ${where} has unknown status "${String(status)}"`);
    if (f.milestone === null) continue;
    const lane = laneById.get(f.milestone as string);
    if (!lane) throw new Error(`roadmap.json: ${where} has unknown milestone "${String(f.milestone)}"`);

    const feature: Feature = {
      id,
      name: field<string>(f, 'name', 'string', where),
      group: field<string>(f, 'group', 'string', where),
      status,
      note: typeof f.note === 'string' ? f.note : '',
    };
    let cluster = lane.groups.find((g) => g.name === feature.group);
    if (!cluster) {
      cluster = { name: feature.group, features: [] };
      lane.groups.push(cluster);
    }
    cluster.features.push(feature);
  }

  for (const lane of lanes) {
    lane.groups.sort((a, b) => a.name.localeCompare(b.name));
    for (const group of lane.groups) {
      group.features.sort(
        (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.name.localeCompare(b.name),
      );
    }
  }

  return {
    lanes,
    done: lanes.reduce((sum, lane) => sum + lane.done, 0),
    total: lanes.reduce((sum, lane) => sum + lane.total, 0),
  };
}

export interface Roadmap extends RoadmapModel {
  version: string;
  builtAt: Date;
}

async function fetchJson(fetchFn: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchFn(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (cause) {
    throw new Error(`${url} returned invalid JSON`, { cause });
  }
}

const RELEASE_TAG_PATH = '/releases/tag/';

/**
 * Reads the latest release tag from the redirect of the public /releases/latest
 * page, which avoids the rate-limited GitHub API.
 */
async function fetchLatestTag(fetchFn: typeof fetch): Promise<string> {
  const response = await fetchFn(LATEST_RELEASE_URL, { redirect: 'manual' });
  if (response.status < 300 || response.status >= 400) {
    throw new Error(`${LATEST_RELEASE_URL} returned HTTP ${response.status}, expected a redirect`);
  }
  const location = response.headers.get('Location');
  if (!location) throw new Error(`${LATEST_RELEASE_URL} redirect has no Location header`);
  const start = location.indexOf(RELEASE_TAG_PATH);
  const tag = start < 0 ? '' : location.slice(start + RELEASE_TAG_PATH.length).split(/[/?#]/)[0];
  if (!tag) throw new Error(`${LATEST_RELEASE_URL} redirected to a URL without ${RELEASE_TAG_PATH}<tag>`);
  return decodeURIComponent(tag);
}

/**
 * Fetches roadmap.json and the latest release tag from the public repo.
 *
 * Runs at build time only. Any failed request or invalid data throws, which
 * fails the build and leaves the previous deployment live.
 */
export async function loadRoadmap(fetchFn: typeof fetch = fetch): Promise<Roadmap> {
  const [raw, version] = await Promise.all([fetchJson(fetchFn, ROADMAP_JSON_URL), fetchLatestTag(fetchFn)]);
  return { ...parseRoadmap(raw), version, builtAt: new Date() };
}
