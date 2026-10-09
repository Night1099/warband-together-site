import type { APIRoute } from 'astro';
import { renderProgressSvg } from '../lib/progress-svg';
import { loadRoadmap } from '../lib/roadmap';

export const GET: APIRoute = async () =>
  new Response(renderProgressSvg(await loadRoadmap()), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
