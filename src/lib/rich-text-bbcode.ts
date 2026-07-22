type Attributes = Record<string, string>;
type Node = { type: 'text'; value: string } | { type: 'tag'; name: string; value?: string; attributes: Attributes; children: Node[] };

const allowed = new Set(['b', 'i', 'u', 's', 'color', 'font_size', 'wave', 'shake', 'rainbow', 'pulse']);
const animated = new Set(['wave', 'shake', 'rainbow', 'pulse']);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function parse(source: string): Node[] {
  const root: Node[] = [];
  const stack: { name: string; children: Node[] }[] = [{ name: '', children: root }];
  const token = /\[[^\]\n]+\]/g;
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    if (match.index! > cursor) stack.at(-1)!.children.push({ type: 'text', value: source.slice(cursor, match.index) });
    const raw = match[0];
    const closing = raw.startsWith('[/');
    const body = raw.slice(closing ? 2 : 1, -1).trim();
    const nameMatch = body.match(/^([a-z_]+)/i);
    const name = nameMatch?.[1].toLowerCase() ?? '';
    if (!allowed.has(name)) stack.at(-1)!.children.push({ type: 'text', value: raw });
    else if (closing) {
      if (stack.length > 1 && stack.at(-1)!.name === name) stack.pop();
      else stack.at(-1)!.children.push({ type: 'text', value: raw });
    } else {
      const remainder = body.slice(name.length).trim();
      let value: string | undefined;
      const attributes: Attributes = {};
      if (remainder.startsWith('=')) value = remainder.slice(1).trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
      else {
        const attribute = /([a-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi;
        for (const match of remainder.matchAll(attribute)) attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
      }
      const node: Extract<Node, { type: 'tag' }> = { type: 'tag', name, value, attributes, children: [] };
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
  const output: string[] = [];
  let word: string[] = [];
  const flushWord = () => {
    if (!word.length) return;
    output.push(`<span class="rt-word">${word.join('')}</span>`);
    word = [];
  };
  for (const segment of segments) {
    if (segment === '\n') {
      flushWord();
      output.push(`<br class="rt-char rt-break" style="--char-index:${state.index++}">`);
      continue;
    }
    const index = state.index++;
    if (segment === ' ' || segment === '\t') {
      flushWord();
      const content = segment === '\t' ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '&nbsp;';
      output.push(`<span class="rt-char rt-space${segment === '\t' ? ' rt-tab' : ''}" style="--char-index:${index}">${content}</span>`);
      continue;
    }
    word.push(`<span class="rt-char" style="--char-index:${index}">${escapeHtml(segment)}</span>`);
  }
  flushWord();
  return output.join('');
}

function safeColor(value = ''): string | null {
  return /^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+-]+\)|[a-z]{1,24})$/i.test(value) ? value : null;
}

function safeSize(value = ''): string | null {
  const number = Number(value.replace(/px$/i, ''));
  return Number.isFinite(number) && number >= 8 && number <= 96 ? `${number}px` : null;
}

function numberAttribute(node: Extract<Node, { type: 'tag' }>, names: string[], min: number, max: number): number | null {
  const raw = names.map((name) => node.attributes[name]).find((value) => value !== undefined) ?? node.value;
  if (raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function percentageAttribute(node: Extract<Node, { type: 'tag' }>, names: string[]): number | null {
  const value = numberAttribute(node, names, 0, 100);
  if (value === null) return null;
  return value <= 1 ? value * 100 : value;
}

const cssNumber = (value: number) => Number(value.toFixed(4));

function effectStyle(node: Extract<Node, { type: 'tag' }>): string {
  const styles: string[] = [];
  if (node.name === 'shake') {
    const rate = numberAttribute(node, ['rate', 'speed'], 0.1, 60);
    const level = numberAttribute(node, ['level', 'strength'], 0, 24);
    if (rate !== null) styles.push(`--rt-shake-duration:${cssNumber(1 / rate)}s`, `--rt-shake-phase:${cssNumber(Math.max(2, 120 / rate))}ms`);
    if (level !== null) styles.push(`--rt-shake-level:${level}px`);
  }
  if (node.name === 'wave') {
    const rate = numberAttribute(node, ['rate', 'speed'], 0.1, 10);
    const amplitude = numberAttribute(node, ['amp', 'amplitude'], 0, 32);
    const frequency = numberAttribute(node, ['freq', 'frequency'], 0.1, 20);
    if (rate !== null) styles.push(`--rt-wave-duration:${cssNumber(1 / rate)}s`);
    if (amplitude !== null) styles.push(`--rt-wave-amplitude:${amplitude}px`);
    if (frequency !== null) styles.push(`--rt-wave-phase:${cssNumber(60 / frequency)}ms`);
  }
  if (node.name === 'rainbow') {
    const rate = numberAttribute(node, ['rate', 'speed'], 0.1, 10);
    const frequency = numberAttribute(node, ['freq', 'frequency'], 0.1, 20);
    const saturation = percentageAttribute(node, ['sat', 'saturation']);
    const lightness = percentageAttribute(node, ['val', 'value', 'lightness']);
    if (rate !== null) styles.push(`--rt-rainbow-duration:${cssNumber(1 / rate)}s`);
    if (frequency !== null) styles.push(`--rt-rainbow-phase:${cssNumber(-85 * frequency)}ms`);
    if (saturation !== null) styles.push(`--rt-rainbow-saturation:${saturation}%`);
    if (lightness !== null) styles.push(`--rt-rainbow-lightness:${lightness}%`);
  }
  if (node.name === 'pulse') {
    const rate = numberAttribute(node, ['rate', 'speed'], 0.1, 10);
    const scale = numberAttribute(node, ['scale', 'level'], 1, 2);
    const opacity = numberAttribute(node, ['opacity'], 0.1, 1);
    if (rate !== null) styles.push(`--rt-pulse-duration:${cssNumber(1 / rate)}s`);
    if (scale !== null) styles.push(`--rt-pulse-scale:${scale}`);
    if (opacity !== null) styles.push(`--rt-pulse-opacity:${opacity}`);
  }
  return styles.length ? ` style="${styles.join(';')}"` : '';
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
    return `<span class="rt-effect rt-${node.name}"${effectStyle(node)}>${content}</span>`;
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
