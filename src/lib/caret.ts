// ============================================================
// hodi - Caret position in a textarea (in pixels)
//
// A textarea does not tell which screen line the caret is on. The usual trick:
// build a "mirror" div with the same width and font, copy the text before the
// caret into it, then measure a marker span at the end.
// Used for typewriter mode (keeps the current line mid-screen).
// ============================================================

let mirror: HTMLDivElement | null = null;

const COPY = [
  'boxSizing', 'width', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
  'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderWidth',
  'whiteSpace', 'overflowWrap', 'wordBreak', 'tabSize',
] as const;

/** Distance (px) from the textarea top to the top of the caret's line. */
export function caretTop(el: HTMLTextAreaElement): number {
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    Object.assign(mirror.style, { position: 'absolute', top: '0', left: '-9999px', visibility: 'hidden' });
    document.body.appendChild(mirror);
  }
  const cs = getComputedStyle(el);
  for (const prop of COPY) mirror.style[prop] = cs[prop];
  mirror.style.width = `${el.clientWidth}px`;

  mirror.textContent = el.value.slice(0, el.selectionEnd);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  return marker.offsetTop;
}
