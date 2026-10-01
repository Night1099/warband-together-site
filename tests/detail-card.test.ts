// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { initDetailCards } from '../src/scripts/detail-card';

const lane = (id: string, blocks: string) => `
  <section class="lane" id="${id}">
    ${blocks}
    <div class="detail-card" hidden>
      <h3 class="card-name"></h3><span class="card-status"></span><span class="card-group"></span>
      <p class="card-note"></p>
    </div>
  </section>`;
const block = (name: string, note = '') =>
  `<button type="button" class="block" aria-expanded="false" data-name="${name}" data-status="Planned" data-group="Towns" data-note="${note}"></button>`;

// A fresh document per test keeps listeners from earlier tests out of this one.
let doc: Document;
const $ = (sel: string) => doc.querySelector<HTMLElement>(sel)!;
const card = (laneId: string) => $(`#${laneId} .detail-card`);
const blockNamed = (name: string) => $(`button[data-name="${name}"]`);

describe('initDetailCards', () => {
  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML =
      lane('a', block('Arena', 'Not available yet.') + block('Tavern')) + lane('b', block('Fiefs')) + '<p id="out">x</p>';
    initDetailCards(doc);
  });

  it('opens the lane card with the block fields', () => {
    blockNamed('Arena').click();
    expect(card('a').hidden).toBe(false);
    expect($('#a .card-name').textContent).toBe('Arena');
    expect($('#a .card-status').textContent).toBe('Planned');
    expect($('#a .card-group').textContent).toBe('Towns');
    expect($('#a .card-note').textContent).toBe('Not available yet.');
    expect($('#a .card-note').hidden).toBe(false);
    expect(blockNamed('Arena').getAttribute('aria-expanded')).toBe('true');
  });

  it('hides the note line when the note is empty', () => {
    blockNamed('Tavern').click();
    expect($('#a .card-note').hidden).toBe(true);
  });

  it('closes when the same block is clicked again', () => {
    blockNamed('Arena').click();
    blockNamed('Arena').click();
    expect(card('a').hidden).toBe(true);
    expect(blockNamed('Arena').getAttribute('aria-expanded')).toBe('false');
  });

  it('replaces the card when another block in the lane is clicked', () => {
    blockNamed('Arena').click();
    blockNamed('Tavern').click();
    expect($('#a .card-name').textContent).toBe('Tavern');
    expect(blockNamed('Arena').getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps only one card open across lanes, and Esc closes it', () => {
    blockNamed('Arena').click();
    blockNamed('Fiefs').click();
    expect(card('a').hidden).toBe(true);
    expect(card('b').hidden).toBe(false);
    doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(card('b').hidden).toBe(true);
    expect(blockNamed('Fiefs').getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a click outside, but not on a click inside the card', () => {
    blockNamed('Arena').click();
    $('#a .card-name').click();
    expect(card('a').hidden).toBe(false);
    $('#out').click();
    expect(card('a').hidden).toBe(true);
  });

  it('writes markup in a note as literal text', () => {
    blockNamed('Arena').dataset.note = '<b>bold</b> & "quoted"';
    blockNamed('Arena').click();
    expect($('#a .card-note').textContent).toBe('<b>bold</b> & "quoted"');
    expect($('#a .card-note').querySelector('b')).toBeNull();
  });
});
