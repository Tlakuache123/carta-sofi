type Node = { type: 'text'; value: string } | { type: 'tag'; name: string; value?: string; children: Node[] };

const allowed = new Set(['b', 'i', 'u', 's', 'color', 'font_size', 'wave', 'shake', 'rainbow', 'pulse']);
const animated = new Set(['wave', 'shake', 'rainbow', 'pulse']);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function parse(source: string): Node[] {
  const root: Node[] = [];
  const stack: { name: string; children: Node[] }[] = [{ name: '', children: root }];
  const token = /\[\/?[a-z_]+(?:=[^\]]+)?\]/gi;
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    if (match.index! > cursor) stack.at(-1)!.children.push({ type: 'text', value: source.slice(cursor, match.index) });
    const raw = match[0];
    const closing = raw.startsWith('[/');
    const body = raw.slice(closing ? 2 : 1, -1);
    const [nameRaw, ...valueParts] = body.split('=');
    const name = nameRaw.toLowerCase();
    if (!allowed.has(name)) stack.at(-1)!.children.push({ type: 'text', value: raw });
    else if (closing) {
      if (stack.length > 1 && stack.at(-1)!.name === name) stack.pop();
      else stack.at(-1)!.children.push({ type: 'text', value: raw });
    } else {
      const node: Extract<Node, { type: 'tag' }> = { type: 'tag', name, value: valueParts.join('=').trim(), children: [] };
      stack.at(-1)!.children.push(node);
      stack.push(node);
    }
    cursor = match.index! + raw.length;
  }
  if (cursor < source.length) stack.at(-1)!.children.push({ type: 'text', value: source.slice(cursor) });
  return root;
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('es', { granularity: 'grapheme' })
  : null;

function characters(value: string, state: { index: number }): string {
  const segments = segmenter ? [...segmenter.segment(value)].map(({ segment }) => segment) : [...value];
  return segments.map((segment) => {
    if (segment === '\n') return '<br>';
    const index = state.index++;
    if (segment === ' ') return `<span class="rt-char rt-space" style="--char-index:${index}">&nbsp;</span>`;
    if (segment === '\t') return `<span class="rt-char rt-space rt-tab" style="--char-index:${index}">&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
    return `<span class="rt-char" style="--char-index:${index}">${escapeHtml(segment)}</span>`;
  }).join('');
}

function safeColor(value = ''): string | null {
  return /^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+-]+\)|[a-z]{1,24})$/i.test(value) ? value : null;
}

function safeSize(value = ''): string | null {
  const number = Number(value.replace(/px$/i, ''));
  return Number.isFinite(number) && number >= 8 && number <= 96 ? `${number}px` : null;
}

function render(nodes: Node[], state: { index: number }, splitAll = false, insideEffect = false): string {
  return nodes.map((node) => {
    if (node.type === 'text') return splitAll || insideEffect ? characters(node.value, state) : escapeHtml(node.value);
    const content = render(node.children, state, splitAll, insideEffect || animated.has(node.name));
    if (node.name === 'b') return `<strong>${content}</strong>`;
    if (node.name === 'i') return `<em>${content}</em>`;
    if (node.name === 'u') return `<span class="rt-underline">${content}</span>`;
    if (node.name === 's') return `<s>${content}</s>`;
    if (node.name === 'color') { const color = safeColor(node.value); return color ? `<span style="color:${color}">${content}</span>` : content; }
    if (node.name === 'font_size') { const size = safeSize(node.value); return size ? `<span style="font-size:${size}">${content}</span>` : content; }
    return `<span class="rt-effect rt-${node.name}">${content}</span>`;
  }).join('');
}

export function renderBBCode(source: string, options: { splitAll?: boolean } = {}): string {
  return render(parse(source), { index: 0 }, options.splitAll);
}

export function renderTextAsCharacters(source: string): string {
  return characters(source, { index: 0 });
}

export function bbCodeToText(source: string): string {
  const read = (nodes: Node[]): string => nodes.map((node) => node.type === 'text' ? node.value : read(node.children)).join('');
  return read(parse(source));
}
