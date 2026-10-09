import { STATUSES, type RoadmapModel, type Status } from './roadmap';

/** Fill colours, kept in step with the --status-* tokens in theme.css. */
const STATUS_COLORS: Record<Status, string> = {
  Works: '#5a7d2a',
  'In testing': '#3f7f7a',
  'Partly works': '#c08a2d',
  'Known issue': '#9b2d20',
  Planned: '#a89a7c',
  'Not yet assessed': '#d9ccae',
  'Not in coop': '#6b5a43',
};

const WIDTH = 720;
const PAD = 16;
const NAME_WIDTH = 150;
const COUNT_WIDTH = 70;
const BAR_X = PAD + NAME_WIDTH;
const BAR_WIDTH = WIDTH - BAR_X - COUNT_WIDTH - PAD;
const BAR_HEIGHT = 14;
const HEADER_HEIGHT = 48;
const ROW_HEIGHT = 26;
const LEGEND_ROW_HEIGHT = 20;
const LEGEND_PER_ROW = 4;
const LEGEND_COLUMN = (WIDTH - 2 * PAD) / LEGEND_PER_ROW;

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Splits `width` across `counts` so the rounded segments sum to exactly `width`. */
function segmentWidths(counts: number[], width: number): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0);
  let seen = 0;
  let edge = 0;
  return counts.map((n) => {
    seen += n;
    const next = total === 0 ? 0 : Math.round((seen / total) * width);
    const segment = next - edge;
    edge = next;
    return segment;
  });
}

function laneRow(lane: RoadmapModel['lanes'][number], y: number): string {
  const counts = STATUSES.map(
    (status) => lane.groups.flatMap((g) => g.features).filter((f) => f.status === status).length,
  );
  let x = BAR_X;
  const segments = segmentWidths(counts, BAR_WIDTH)
    .map((w, i) => {
      const rect = w > 0 ? `<rect x="${x}" y="${y}" width="${w}" height="${BAR_HEIGHT}" fill="${STATUS_COLORS[STATUSES[i]]}"/>` : '';
      x += w;
      return rect;
    })
    .join('');
  const textY = y + BAR_HEIGHT - 2;
  return [
    `<text x="${PAD}" y="${textY}" class="name">${escapeXml(lane.name)}</text>`,
    segments,
    `<rect x="${BAR_X}" y="${y}" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" class="frame"/>`,
    `<text x="${WIDTH - PAD}" y="${textY}" class="count" text-anchor="end">${lane.done} / ${lane.total}</text>`,
  ].join('');
}

function legend(y: number): string {
  return STATUSES.map((status, i) => {
    const x = PAD + (i % LEGEND_PER_ROW) * LEGEND_COLUMN;
    const rowY = y + Math.floor(i / LEGEND_PER_ROW) * LEGEND_ROW_HEIGHT;
    return (
      `<rect x="${x}" y="${rowY}" width="12" height="12" fill="${STATUS_COLORS[status]}" class="swatch"/>` +
      `<text x="${x + 18}" y="${rowY + 11}" class="legend">${status}</text>`
    );
  }).join('');
}

/**
 * Renders the roadmap as a self-contained SVG card: one stacked status bar per
 * milestone plus the legend. Meant for embedding as an image (the public README),
 * so it carries no script, links or external fonts.
 */
export function renderProgressSvg(roadmap: RoadmapModel & { version: string }): string {
  const rowsY = HEADER_HEIGHT;
  const legendY = rowsY + roadmap.lanes.length * ROW_HEIGHT + 8;
  const height = legendY + Math.ceil(STATUSES.length / LEGEND_PER_ROW) * LEGEND_ROW_HEIGHT + PAD - 8;
  const title = `Warband Together roadmap: ${roadmap.done} of ${roadmap.total} features done`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(title)}">`,
    `<title>${escapeXml(title)}</title>`,
    '<style>text{font-family:Georgia,\'Times New Roman\',serif;fill:#3b2a17}',
    '.title{font-size:18px;font-variant:small-caps}.sub{font-size:13px;fill:#7a6245}',
    '.name{font-size:14px}.count{font-size:13px;fill:#7a6245}.legend{font-size:12px}',
    '.frame{fill:none}.frame,.swatch{stroke:#5c4526;stroke-width:1}</style>',
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="6" fill="#efe4c8" stroke="#7a1f1f"/>`,
    `<text x="${PAD}" y="28" class="title">Warband Together roadmap</text>`,
    `<text x="${WIDTH - PAD}" y="28" class="sub" text-anchor="end">${roadmap.done} of ${roadmap.total} features done · ${escapeXml(roadmap.version)}</text>`,
    ...roadmap.lanes.map((lane, i) => laneRow(lane, rowsY + i * ROW_HEIGHT)),
    legend(legendY),
    '</svg>',
  ].join('');
}
