import { buildColors } from './build-theme.mjs';
import * as provenance from './scheme-provenance.mjs';
import * as borrow from './scheme-borrow.mjs';
import * as effect from './scheme-effect.mjs';
import * as signal from './scheme-signal.mjs';
import * as tone from './scheme-tone.mjs';
import { hex2lch, contrast, mix, readable } from './color.mjs';

const hueDist = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

const TARGETS = [25, 75, 140, 265];

export function deriveStatus(syntax, bg, isDark) {
  const hx = (v) => (typeof v === 'string' ? v : v.hex);
  const roles = Object.entries(syntax)
    .filter(([k]) => ['keyword', 'string', 'func', 'type', 'number', 'tag'].includes(k))
    .map(([, v]) => ({ hex: hx(v), hue: hex2lch(hx(v))[2] }));

  let best = null;
  const walk = (slot, taken, cost, chosen) => {
    if (slot === TARGETS.length) {
      if (!best || cost < best.cost) best = { cost, chosen: [...chosen] };
      return;
    }
    for (let i = 0; i < roles.length; i++) {
      if (taken.has(i)) continue;
      taken.add(i);
      chosen.push(roles[i].hex);
      walk(slot + 1, taken, cost + hueDist(roles[i].hue, TARGETS[slot]), chosen);
      chosen.pop();
      taken.delete(i);
    }
  };
  walk(0, new Set(), 0, []);

  const lift = (c) => (contrast(c, bg) >= 5.0 ? c : readable(c, bg, 5.0));
  const [error, warn, ok, info] = best.chosen.map(lift);
  return {
    error, warn, info, ok,
    added: ok, modified: info, deleted: error, conflict: warn,
  };
}

const S = (scope, foreground, fontStyle) => ({
  scope,
  settings: fontStyle ? { foreground, fontStyle } : { foreground },
});

export function buildTokenColors(y) {
  return [
    { name: 'Comment', ...S(['comment', 'punctuation.definition.comment', 'string.comment'], y.comment, 'italic') },
    { name: 'Comment keyword', ...S(['keyword.codetag', 'comment keyword.other', 'storage.type.class.jsdoc'], y.tag, 'italic bold') },
    { name: 'Variables', ...S(['variable', 'variable.other.readwrite', 'meta.definition.variable.name', 'support.variable', 'string constant.other.placeholder'], y.variable) },
    { name: 'Parameters', ...S(['variable.parameter', 'meta.parameter', 'variable.other.jsdoc'], y.variable, 'italic') },
    { name: 'Properties', ...S(['variable.other.property', 'variable.other.object.property', 'meta.object-literal.key', 'support.type.property-name', 'variable.other.member'], y.variable) },
    { name: 'Language variables', ...S(['variable.language', 'variable.language.this', 'variable.language.super', 'keyword.other.this'], y.tag, 'italic') },
    { name: 'Constants and enum members', ...S(['variable.other.constant', 'variable.other.enummember', 'constant.other.caps', 'entity.name.constant'], y.number) },
    { name: 'Numbers and language constants', ...S(['constant.numeric', 'constant.language', 'constant.language.boolean', 'constant.language.null', 'constant.language.undefined', 'keyword.other.unit', 'support.constant'], y.number) },
    { name: 'Escapes', ...S(['constant.character', 'constant.character.escape', 'constant.other.character-class.regexp'], y.number) },
    { name: 'Strings', ...S(['string', 'string.quoted', 'string.template', 'punctuation.definition.string'], y.string) },
    { name: 'Template expression punctuation', ...S(['punctuation.definition.template-expression', 'punctuation.section.embedded', 'meta.embedded'], y.keyword) },
    { name: 'Regular expressions', ...S(['string.regexp', 'constant.regexp'], y.type) },
    { name: 'Regexp operators', ...S(['keyword.operator.or.regexp', 'keyword.control.anchor.regexp', 'keyword.operator.quantifier.regexp'], y.tag) },
    { name: 'Keywords', ...S(['keyword', 'keyword.control', 'keyword.other', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.expression', 'keyword.operator.new', 'keyword.operator.delete', 'keyword.operator.logical.python'], y.keyword) },
    { name: 'Import and export', ...S(['keyword.control.import', 'keyword.control.export', 'keyword.control.from', 'keyword.control.default', 'keyword.control.as'], y.keyword, 'italic') },
    { name: 'Operators and punctuation', ...S(['keyword.operator', 'punctuation', 'punctuation.separator', 'punctuation.terminator', 'meta.brace', 'punctuation.accessor'], y.op) },
    { name: 'Arrow functions', ...S(['storage.type.function.arrow', 'keyword.operator.arrow', 'storage.type.function.lambda'], y.tag) },
    { name: 'Functions and methods', ...S(['entity.name.function', 'meta.function-call.generic', 'support.function', 'meta.require', 'variable.function', 'entity.name.method'], y.func) },
    { name: 'Function declarations', ...S(['meta.definition.method entity.name.function', 'meta.definition.function entity.name.function'], y.func, 'bold') },
    { name: 'Decorators', ...S(['meta.decorator', 'entity.name.function.decorator', 'punctuation.decorator', 'meta.decorator variable.other'], y.func, 'italic') },
    { name: 'Types and classes', ...S(['entity.name.type', 'entity.name.class', 'entity.name.namespace', 'entity.name.scope-resolution', 'support.type', 'support.class', 'entity.other.inherited-class', 'entity.name.type.interface', 'entity.name.type.enum', 'entity.name.type.alias', 'meta.type.declaration entity.name.type'], y.type) },
    { name: 'Primitive types', ...S(['support.type.primitive', 'keyword.type', 'storage.type.primitive', 'support.type.builtin'], y.type, 'italic') },
    { name: 'Tags', ...S(['entity.name.tag', 'punctuation.definition.tag', 'meta.tag'], y.tag) },
    { name: 'Component tags', ...S(['support.class.component', 'entity.name.tag.jsx-component', 'entity.name.tag.namespace'], y.type) },
    { name: 'Attributes', ...S(['entity.other.attribute-name', 'meta.attribute', 'entity.other.attribute-name.html'], y.number, 'italic') },
    { name: 'CSS selectors', ...S(['entity.name.tag.css', 'entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css', 'entity.other.attribute-name.pseudo-class.css', 'entity.other.attribute-name.pseudo-element.css'], y.keyword) },
    { name: 'CSS properties', ...S(['support.type.property-name.css', 'meta.property-name.css'], y.func) },
    { name: 'CSS values', ...S(['support.constant.property-value.css', 'support.constant.color', 'constant.other.color'], y.string) },
    { name: 'JSON keys', ...S(['support.type.property-name.json', 'meta.structure.dictionary.json string.quoted.double.json'], y.func) },
    { name: 'JSON values', ...S(['meta.structure.dictionary.value.json string.quoted.double.json'], y.string) },
    { name: 'YAML keys', ...S(['entity.name.tag.yaml', 'punctuation.definition.map.key.yaml', 'punctuation.separator.key-value'], y.func) },
    { name: 'Rust lifetimes', ...S(['entity.name.type.lifetime', 'punctuation.definition.lifetime',
      'storage.modifier.lifetime'], y.tag, 'italic') },
    { name: 'Rust macros', ...S(['entity.name.function.macro.rust', 'support.function.macro'], y.tag) },
    { name: 'Go struct tags', ...S(['string.quoted.raw.go', 'meta.struct-tag.go'], y.number) },
    { name: 'Python f-string placeholders', ...S(['meta.fstring.python constant.character.format.placeholder', 'constant.character.format.placeholder.other.python'], y.number) },
    { name: 'C preprocessor', ...S(['keyword.control.directive', 'meta.preprocessor', 'entity.name.function.preprocessor'], y.tag, 'italic') },
    { name: 'PHP and shell variables', ...S(['variable.other.php', 'punctuation.definition.variable.php', 'variable.other.normal.shell', 'punctuation.definition.variable.shell'], y.number) },
    { name: 'SQL keywords', ...S(['keyword.other.DML', 'keyword.other.DDL', 'keyword.other.sql'], y.keyword) },
    { name: 'GraphQL and Terraform blocks', ...S(['keyword.other.block.graphql', 'entity.name.type.graphql', 'entity.name.type.terraform', 'storage.type.function.terraform'], y.type) },
    { name: 'Markdown headings', ...S(['markup.heading', 'entity.name.section.markdown', 'punctuation.definition.heading.markdown'], y.keyword, 'bold') },
    { name: 'Markdown bold', ...S(['markup.bold', 'punctuation.definition.bold'], y.number, 'bold') },
    { name: 'Markdown italic', ...S(['markup.italic', 'punctuation.definition.italic'], y.tag, 'italic') },
    { name: 'Markdown strikethrough', ...S(['markup.strikethrough'], y.comment, 'strikethrough') },
    { name: 'Markdown links', ...S(['markup.underline.link', 'string.other.link', 'constant.other.reference.link.markdown'], y.string, 'underline') },
    { name: 'Markdown link text', ...S(['string.other.link.title.markdown', 'meta.link.inline.markdown'], y.func) },
    { name: 'Markdown code', ...S(['markup.inline.raw', 'markup.fenced_code', 'markup.raw.block', 'fenced_code.block.language'], y.type) },
    { name: 'Markdown quote', ...S(['markup.quote', 'punctuation.definition.quote.begin', 'blockquote'], y.op, 'italic') },
    { name: 'Markdown list bullets', ...S(['punctuation.definition.list.begin', 'punctuation.definition.list.end'], y.tag) },
    { name: 'Diff inserted', ...S(['markup.inserted', 'meta.diff.header.to-file', 'punctuation.definition.inserted'], y.st.added) },
    { name: 'Diff deleted', ...S(['markup.deleted', 'meta.diff.header.from-file', 'punctuation.definition.deleted'], y.st.deleted) },
    { name: 'Diff changed', ...S(['markup.changed', 'punctuation.definition.changed'], y.st.conflict) },
    { name: 'Diff header', ...S(['meta.diff.header', 'meta.diff.range'], y.keyword) },
    { name: 'Shell builtins', ...S(['support.function.builtin.shell', 'entity.name.command.shell', 'meta.function-call.shell'], y.func) },
    { name: 'Markdown heading levels', ...S(['heading', 'heading.1.markdown', 'heading.2.markdown', 'heading.3.markdown',
      'heading.4.markdown', 'heading.5.markdown', 'heading.6.markdown'], y.func, 'bold') },
    { name: 'Markdown lists and tables', ...S(['markup.list.unnumbered', 'markup.list.numbered', 'markup.table',
      'markup.list', 'markup.underline'], y.op) },
    { name: 'Log errors', ...S(['log.error', 'log.exception', 'log.exceptiontype'], y.st.error) },
    { name: 'Log warnings', ...S(['log.warning'], y.st.warn) },
    { name: 'Log info and dates', ...S(['log.info', 'log.date', 'log.verbose', 'log.debug'], y.op, 'italic') },
    { name: 'Log values', ...S(['log.constant', 'log.string'], y.string) },
    { name: 'Operators by name', ...S(['entity.name.operator', 'entity.name.operator.type',
      'entity.name.operator.custom-literal', 'punctuation.vararg-ellipses'], y.op) },
    { name: 'Preprocessor macros', ...S(['entity.name.other.preprocessor', 'entity.name.other.preprocessor.macro',
      'entity.name.other.preprocessor.macro.include'], y.tag) },
    { name: 'Labels and native attributes', ...S(['entity.name.label', 'entity.name.label.call',
      'support.other.attribute', 'entity.other.attribute'], y.type) },
    { name: 'Declared names', ...S(['entity.name.variable', 'entity.name.variable.local',
      'entity.name.variable.property', 'entity.name.variable.field', 'entity.name.variable.parameter'], y.variable) },
    { name: 'Sections and groups', ...S(['entity.name.section', 'entity.name.section.group-title'], y.func, 'bold') },
    { name: 'Doc comment tags', ...S(['constant.other.description.jsdoc', 'constant.other.email.link.underline.jsdoc',
      'entity.name.type.instance.jsdoc'], y.comment, 'italic') },
    { name: 'Regexp character classes', ...S(['constant.other.character-class', 'constant.other.character-class.set', 'constant.other.character-class.range'], y.type) },
    { name: 'Math constants', ...S(['constant.other.general.math', 'constant.other.math',
      'line.separator.math'], y.number) },
    { name: 'Lisp keywords and globals', ...S(['constant.keyword', 'entity.global'], y.keyword) },
    { name: 'Generic constants', ...S(['constant.other', 'constant.sha', 'constant.global',
      'constant.other.symbol', 'constant.other.option'], y.number) },
    { name: 'Generic raw markup', ...S(['markup.raw', 'markup.raw.texttt', 'markup.raw.verbatim',
      'markup.raw.verb', 'markup.raw.yaml.front-matter'], y.string) },
    { name: 'Attribute values', ...S(['entity.other.attribute-value', 'property.value',
      'constant.other.inline-data'], y.string) },
    { name: 'References and footnotes', ...S(['constant.other.reference.citation', 'constant.other.reference.label',
      'entity.name.footnote'], y.tag) },
    { name: 'Character literals', ...S(['char', 'constant.character.character-class', 'constant.character.control'], y.number) },
    { name: 'Anonymous and inline functions', ...S(['function.anonymous', 'name.generic.filter',
      'args.mixin'], y.func) },
    { name: 'Inline tags', ...S(['tag.inline', 'tag.case.control.flow', 'inline'], y.tag) },
    { name: 'Snippet placeholders', ...S(['custom.punctuation', 'custom.variable',
      'punctuation.section.insertion'], y.op) },
    { name: 'Expression groups', ...S(['expression.group'], y.op) },
    { name: 'CSS and Less extras', ...S(['entity.other.keyframe-offset', 'entity.other.counter-style-name',
      'entity.other.counter-name', 'entity.other.namespace-prefix', 'entity.name.namespace-prefix',
      'support.keyword.repetitions', 'support.other.variable', 'support.unicode-range',
      'constant.codepoint-range'], y.type) },
    { name: 'Enums and module names', ...S(['constant.enum', 'constant.variable', 'entity.name.import',
      'entity.name.module', 'support.other.namespace', 'support.namespace', 'entity.other.alias'], y.number) },
    { name: 'Language protocols and attributes', ...S(['support.other.protocol', 'support.attribute',
      'support.other.php', 'entity.scope', 'entity.name.pragma.name', 'constant.name.attribute.tag'], y.tag) },
    { name: 'Goto labels and document markers', ...S(['entity.name.goto-label', 'entity.other.document.begin',
      'entity.other.document.end'], y.op) },
    { name: 'Regexp anchors and groups', ...S(['support.other.match', 'support.other.parenthesis.regexp',
      'support.other.escape.special.regexp'], y.tag) },
    { name: 'Inline and block math', ...S(['markup.math.block', 'markup.math.inline'], y.number) },
    { name: 'Documentation strings', ...S(['constant.string.documentation'], y.string, 'italic') },
    { name: 'GraphQL declarations', ...S(['entity.name.fragment', 'entity.scalar', 'keyword.fragment',
      'keyword.interface', 'keyword.enum', 'keyword.input', 'keyword.implements', 'keyword.directive',
      'keyword.on', 'keyword.union', 'keyword.scalar', 'keyword.type'], y.keyword) },
    { name: 'GraphQL and data keys', ...S(['constant.object.key', 'scalar.field'], y.variable) },
    { name: 'HCL and Terraform', ...S(['storage.type.function.hcl', 'support.function.builtin.hcl',
      'support.function.namespaced.hcl', 'support.function.builtin.terraform'], y.func) },
    { name: 'Packages and modules', ...S(['entity.name.package', 'entity.name.namespace.package'], y.type) },
    { name: 'Error types', ...S(['entity.name.error', 'entity.name.type.error'], y.number) },
    { name: 'Module file operators', ...S(['operator.go.mod', 'keyword.operator.go.mod'], y.op) },
    { name: 'Invalid', ...S(['invalid', 'invalid.illegal'], y.st.error, 'italic underline') },
    { name: 'Deprecated', ...S(['invalid.deprecated'], y.st.conflict, 'strikethrough') },
  ];
}

export function buildSemantic(y) {
  const it = (foreground) => ({ foreground, fontStyle: 'italic' });
  return {
    namespace: y.type, class: y.type, 'class.defaultLibrary': it(y.type),
    interface: y.type, enum: y.type, struct: y.type, type: y.type,
    typeParameter: it(y.type), enumMember: y.number,
    function: y.func, 'function.defaultLibrary': it(y.func), method: y.func,
    macro: y.tag, decorator: it(y.func),
    variable: y.variable, 'variable.readonly': y.number,
    'variable.defaultLibrary': it(y.tag),
    parameter: it(y.variable), property: y.variable, 'property.readonly': y.number,
    event: y.tag, keyword: y.keyword, modifier: y.keyword,
    string: y.string, number: y.number, regexp: y.type, operator: y.op,
    comment: it(y.comment), '*.deprecated': { fontStyle: 'strikethrough' },
    label: y.type,
    constant: y.number, builtinConstant: y.number,
    punctuations: y.op, parenthesis: y.op, bracket: y.op, curlybrace: y.op, semicolon: y.op, colon: y.op,
    'function.declaration': { fontStyle: 'bold' }, 'method.declaration': { fontStyle: 'bold' },
    'class.declaration': { fontStyle: 'bold' }, 'interface.declaration': { fontStyle: 'bold' },
    'enum.declaration': { fontStyle: 'bold' }, 'struct.declaration': { fontStyle: 'bold' },
    'type.declaration': { fontStyle: 'bold' }, 'namespace.declaration': { fontStyle: 'bold' },
    'macro.declaration': { fontStyle: 'bold' },
    'function.definition': { fontStyle: 'bold' }, 'method.definition': { fontStyle: 'bold' },
    '*.static': { fontStyle: 'italic' }, '*.abstract': { fontStyle: 'italic' },
    '*.documentation': it(y.comment), '*.builtin': it(y.tag), '*.typeHint': y.type,
    '*.async': { fontStyle: 'italic' },
    enumMember: y.number, 'variable.defaultLibrary': it(y.tag),
  };
}

const wrap = (m) => ({ tokenColors: (y, p) => m.tokenColors(p), semanticTokenColors: (y, p) => m.semanticTokenColors(p) });

const SCHEMES = {
  grammar: { tokenColors: (y) => buildTokenColors(y), semanticTokenColors: (y) => buildSemantic(y) },
  provenance: wrap(provenance), borrow: wrap(borrow), effect: wrap(effect), signal: wrap(signal), tone: wrap(tone),
};

export function emitTheme(spec) {
  const st = spec.status || deriveStatus(spec.syntax, spec.bg, spec.variant === 'dark');
  const full = { ...spec, status: st, ansi: spec.ansi };
  const y = {};
  for (const [k, v] of Object.entries(spec.syntax)) y[k] = typeof v === 'string' ? v : v.hex;
  y.st = st;
  const scheme = SCHEMES[spec.scheme || 'grammar'];
  return {
    $schema: 'vscode://schemas/color-theme',
    name: spec.name,
    type: spec.variant,
    semanticHighlighting: true,
    colors: buildColors({ ...full, syntax: y }),
    tokenColors: scheme.tokenColors(y, spec.palette),
    semanticTokenColors: scheme.semanticTokenColors(y, spec.palette),
  };
}
