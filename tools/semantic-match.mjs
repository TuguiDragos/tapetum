// How VS Code 1.144 picks a theme's style for a semantic token (parseTokenSelector, getTokenStyle): a language
// scores 10, a type 100 less its distance through parent types, each modifier 100; each property goes to the
// highest score, a tie to the later rule. It agreed with every Rust token VS Code 1.144.0 painted under rust-analyzer.

// the token types rust-analyzer 0.4.3102 declares with a parent, from its package.json
export const RUST_ANALYZER_PARENTS = {
  angle: 'punctuation', arithmetic: 'operator', attributeBracket: 'punctuation', bitwise: 'operator', boolean: 'keyword',
  brace: 'punctuation', bracket: 'punctuation', builtinAttribute: 'attribute', builtinType: 'type', character: 'string',
  colon: 'punctuation', comma: 'punctuation', comparison: 'operator', const: 'variable', derive: 'attribute',
  deriveHelper: 'attribute', dot: 'punctuation', logical: 'operator', macroBang: 'punctuation', parenthesis: 'punctuation',
  procMacro: 'macro', operator: 'punctuation', selfKeyword: 'keyword', selfTypeKeyword: 'keyword', semicolon: 'punctuation',
  static: 'variable', toolModule: 'decorator', typeAlias: 'type', union: 'type',
};

const FONT = ['bold', 'italic', 'underline', 'strikethrough'];

function rules(semanticTokenColors) {
  return Object.entries(semanticTokenColors).map(([selector, value]) => {
    const [left, language] = selector.split(':');
    const [type, ...modifiers] = left.split('.');
    const style = { foreground: typeof value === 'string' ? value : value.foreground };
    if (typeof value === 'object' && value.fontStyle !== undefined) {
      const parts = value.fontStyle.split(/\s+/);
      for (const p of FONT) style[p] = parts.includes(p);
    }
    return { selector, type, modifiers, language, style };
  });
}

// the style the theme's own rules give a token; a property no rule sets is left to VS Code's fallbacks
export function resolveSemantic(semanticTokenColors, type, modifiers, language, parents = {}) {
  const hierarchy = [type];
  while (parents[hierarchy[hierarchy.length - 1]]) hierarchy.push(parents[hierarchy[hierarchy.length - 1]]);
  const best = {}, out = {};
  for (const r of rules(semanticTokenColors)) {
    let score = 0;
    if (r.language !== undefined) { if (r.language !== language) continue; score += 10; }
    if (r.type !== '*') { const d = hierarchy.indexOf(r.type); if (d === -1) continue; score += 100 - d; }
    if (!r.modifiers.every((m) => modifiers.includes(m))) continue;
    score += r.modifiers.length * 100;
    for (const p of ['foreground', ...FONT]) {
      if (r.style[p] === undefined || (best[p] ?? -1) > score) continue;
      best[p] = score; out[p] = r.style[p];
    }
  }
  return out;
}

const MUTABILITY = ['borrow', 'provenance', 'effect'];
const ALL = ['grammar', 'provenance', 'borrow', 'effect', 'signal', 'tone'];

// Rust tokens as rust-analyzer 0.4.3102 sends them, each read like the TypeScript token that means the same
export const RUST_READS = [
  { schemes: ALL, rust: ['const', ['constant']], like: ['variable', ['readonly']], what: 'a const item reads as a readonly variable' },
  { schemes: ALL, rust: ['const', ['declaration', 'constant']], like: ['variable', ['declaration', 'readonly']], what: 'a const declaration reads as a const one' },
  { schemes: ALL, rust: ['static', []], like: ['variable', ['readonly']], what: 'a static item reads as a readonly variable' },
  { schemes: ALL.filter((s) => s !== 'effect'), rust: ['static', ['mutable', 'unsafe']], like: ['variable', []], what: 'a static mut reads as a variable' },
  { schemes: ['effect'], rust: ['static', ['mutable', 'unsafe']], like: ['function', ['async']], what: 'reading a static mut burns as an async call does' },
  { schemes: ['effect'], rust: ['function', ['unsafe']], like: ['function', ['async']], what: 'an unsafe call burns as an async call does' },
  { schemes: MUTABILITY, rust: ['variable', []], like: ['variable', ['readonly']], what: 'a binding without mut reads as readonly' },
  { schemes: MUTABILITY, rust: ['variable', ['reference']], like: ['variable', ['readonly']], what: 'a shared reference reads as readonly' },
  { schemes: MUTABILITY, rust: ['variable', ['consuming']], like: ['variable', ['readonly']], what: 'a binding moved away keeps reading as readonly' },
  { schemes: MUTABILITY, rust: ['variable', ['mutable']], like: ['variable', []], what: 'a mut binding reads as a let' },
  { schemes: MUTABILITY, rust: ['variable', ['declaration']], like: ['variable', ['declaration', 'readonly']], what: 'a declaration without mut reads as a const one' },
  { schemes: MUTABILITY, rust: ['variable', ['declaration', 'mutable']], like: ['variable', ['declaration']], what: 'a mut declaration reads as a let one' },
  { schemes: MUTABILITY, rust: ['variable', ['declaration', 'mutable', 'reference']], like: ['variable', ['declaration']], what: 'a &mut declaration reads as a let one' },
  { schemes: ['grammar', 'signal', 'tone'], rust: ['variable', []], like: ['variable', []], what: 'a binding reads as a variable, as rust-analyzer maps it' },
  { schemes: ['grammar', 'signal', 'tone'], rust: ['variable', ['mutable']], like: ['variable', []], what: 'a mut binding reads as a variable' },
  { schemes: ['borrow'], rust: ['parameter', []], like: ['parameter', ['readonly']], what: 'a parameter taken by value reads as a readonly parameter' },
  { schemes: ['borrow'], rust: ['parameter', ['reference']], like: ['parameter', ['readonly']], what: 'a parameter taken by & reads as a readonly parameter' },
  { schemes: ['borrow'], rust: ['parameter', ['mutable', 'reference']], like: ['parameter', []], what: 'a parameter taken by &mut reads as a borrowed one' },
  { schemes: ['borrow'], rust: ['parameter', ['mutable']], like: ['variable', []], with: { italic: true }, what: 'a mut parameter reads as a let, in italic' },
  { schemes: ['borrow'], rust: ['variable', ['mutable', 'reference']], like: ['parameter', []], with: { italic: false }, what: 'a local &mut reads as borrowed' },
  { schemes: ['borrow'], rust: ['selfKeyword', ['reference']], like: ['parameter', ['readonly']], what: '&self reads as a readonly parameter' },
  { schemes: ['borrow'], rust: ['selfKeyword', ['mutable', 'reference']], like: ['parameter', []], what: '&mut self reads as a borrowed parameter' },
  { schemes: ['provenance'], rust: ['selfKeyword', ['reference']], like: ['variable', ['defaultLibrary']], what: 'self comes from the language' },
  { schemes: ['provenance'], rust: ['builtinType', []], like: ['type', ['defaultLibrary']], what: 'a primitive type comes from the language' },
];

const norm = (s) => ({ foreground: (s.foreground || '').toLowerCase(), bold: !!s.bold, italic: !!s.italic });

// every way a theme's scheme reads Rust differently from TypeScript; empty when they agree
export function rustReadsDiffer(semanticTokenColors, scheme) {
  const out = [];
  for (const c of RUST_READS) {
    if (!c.schemes.includes(scheme)) continue;
    const got = norm(resolveSemantic(semanticTokenColors, c.rust[0], c.rust[1], 'rust', RUST_ANALYZER_PARENTS));
    const want = norm({ ...resolveSemantic(semanticTokenColors, c.like[0], c.like[1], 'typescript'), ...(c.with || {}) });
    if (JSON.stringify(got) !== JSON.stringify(want))
      out.push(`${c.what}: Rust ${[c.rust[0], ...c.rust[1]].join('.')} gets ${JSON.stringify(got)}, TypeScript ${[c.like[0], ...c.like[1]].join('.')} ${JSON.stringify(want)}`);
  }
  return out;
}
