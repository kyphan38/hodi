// ============================================================
// hodi - Vị trí con trỏ trong textarea (theo pixel)
//
// Textarea không cho biết con trỏ đang ở dòng nào trên màn hình. Cách quen
// thuộc: dựng một div "gương" cùng chiều rộng, cùng font, chép chữ trước con
// trỏ vào, rồi đo vị trí một span đánh dấu ở cuối.
// Dùng cho chế độ máy đánh chữ (giữ dòng đang gõ ở giữa màn hình).
// ============================================================

let mirror: HTMLDivElement | null = null;

const COPY = [
  'boxSizing', 'width', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
  'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderWidth',
  'whiteSpace', 'overflowWrap', 'wordBreak', 'tabSize',
] as const;

/** Khoảng cách (px) từ đỉnh textarea tới đỉnh dòng chứa con trỏ. */
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
