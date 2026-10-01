function cardFor(block: HTMLElement): HTMLElement {
  return block.closest('.lane')!.querySelector<HTMLElement>('.detail-card')!;
}

function fill(card: HTMLElement, data: DOMStringMap): void {
  card.querySelector('.card-name')!.textContent = data.name ?? '';
  card.querySelector('.card-status')!.textContent = data.status ?? '';
  card.querySelector('.card-group')!.textContent = data.group ?? '';
  const note = card.querySelector<HTMLElement>('.card-note')!;
  note.textContent = data.note ?? '';
  note.hidden = !data.note;
}

/**
 * Wires the pinned detail cards: clicking a block shows its lane's card,
 * clicking it again, pressing Escape or clicking outside closes it. At most
 * one card is open at a time. Text is written with textContent only.
 */
export function initDetailCards(root: Document = document): void {
  let open: HTMLElement | null = null;

  const close = () => {
    if (!open) return;
    cardFor(open).hidden = true;
    open.setAttribute('aria-expanded', 'false');
    open = null;
  };

  const show = (block: HTMLElement) => {
    close();
    const card = cardFor(block);
    fill(card, block.dataset);
    card.hidden = false;
    block.setAttribute('aria-expanded', 'true');
    open = block;
  };

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const block = target.closest<HTMLElement>('button.block');
    if (block) {
      if (block === open) close();
      else show(block);
      return;
    }
    if (!target.closest('.detail-card')) close();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
