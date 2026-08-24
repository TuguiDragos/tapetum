const S = (scope, foreground, fontStyle) => ({ scope, settings: fontStyle ? { foreground, fontStyle } : { foreground } });

export const ink = (p) => ({
  def: p.func, builtin: p.tag, frozen: p.number, lit: p.string,
  dim: p.keyword, fg: p.fg, comment: p.comment, op: p.op,
});

export function tokenColors(p) {
  const { def, builtin, frozen, lit, dim, fg, comment, op } = ink(p);
  return [
    { name: 'Everything you wrote', ...S(['variable', 'variable.other', 'variable.other.readwrite', 'meta.definition.variable.name',
      'variable.other.property', 'variable.other.object.property', 'meta.object-literal.key', 'support.type.property-name',
      'variable.other.member', 'meta.function-call.generic', 'variable.function', 'entity.name.label', 'source'], fg) },
    { name: 'Parameters', ...S(['variable.parameter', 'meta.parameter', 'variable.other.jsdoc'], fg, 'italic') },
    { name: 'Defined here, functions', ...S(['entity.name.function', 'meta.definition.function', 'meta.definition.method',
      'entity.name.method', 'entity.name.function.decorator'], def, 'bold') },
    { name: 'Defined here, types', ...S(['entity.name.type', 'entity.name.class', 'entity.name.namespace', 'entity.name.type.interface',
      'entity.name.type.enum', 'entity.name.type.alias', 'meta.type.declaration', 'entity.name.scope-resolution',
      'entity.name.tag', 'entity.name.tag.jsx-component', 'support.class.component'], def, 'bold') },
    { name: 'From the language itself', ...S(['support.function', 'support.class', 'support.type', 'support.type.builtin',
      'support.type.primitive', 'support.variable', 'support.constant', 'support.module', 'keyword.type',
      'storage.type.primitive', 'meta.require', 'variable.language', 'variable.language.this', 'variable.language.super',
      'keyword.other.this'], builtin, 'italic') },
    { name: 'Cannot change', ...S(['variable.other.constant', 'variable.other.enummember', 'constant.other.caps',
      'entity.name.constant', 'constant.language', 'constant.language.boolean', 'constant.language.null',
      'constant.language.undefined'], frozen) },
    { name: 'Literal data', ...S(['string', 'string.quoted', 'string.template', 'punctuation.definition.string',
      'constant.numeric', 'constant.character', 'constant.character.escape', 'keyword.other.unit',
      'string.regexp', 'constant.regexp', 'constant.other.character-class.regexp', 'string.other.link'], lit) },
    { name: 'Grammar, dimmed', ...S(['keyword', 'keyword.control', 'keyword.other', 'storage', 'storage.type',
      'storage.modifier', 'keyword.operator.expression', 'keyword.operator.new', 'keyword.operator.delete',
      'storage.type.function.arrow', 'keyword.operator.arrow', 'storage.type.function.lambda', 'keyword.control.import',
      'keyword.control.export', 'keyword.control.from', 'keyword.control.as', 'keyword.control.default',
      'keyword.operator.logical.python'], dim) },
    { name: 'Operators and punctuation', ...S(['keyword.operator', 'punctuation', 'punctuation.separator',
      'punctuation.terminator', 'meta.brace', 'punctuation.accessor', 'punctuation.definition.tag',
      'punctuation.definition.template-expression', 'punctuation.section.embedded', 'meta.embedded',
      'keyword.operator.or.regexp', 'keyword.control.anchor.regexp', 'keyword.operator.quantifier.regexp'], op) },
    { name: 'Attributes and inherited', ...S(['entity.other.attribute-name', 'meta.attribute', 'entity.other.inherited-class',
      'meta.decorator', 'punctuation.decorator', 'entity.name.tag.namespace'], builtin, 'italic') },
    { name: 'CSS selectors', ...S(['entity.name.tag.css', 'entity.other.attribute-name.class.css',
      'entity.other.attribute-name.id.css', 'entity.other.attribute-name.pseudo-class.css',
      'entity.other.attribute-name.pseudo-element.css'], def) },
    { name: 'CSS properties', ...S(['support.type.property-name.css', 'meta.property-name.css'], fg) },
    { name: 'CSS values', ...S(['support.constant.property-value.css', 'support.constant.color', 'constant.other.color'], lit) },
    { name: 'JSON keys', ...S(['support.type.property-name.json', 'meta.structure.dictionary.json'], def) },
    { name: 'JSON values', ...S(['meta.structure.dictionary.value.json'], lit) },
    { name: 'Comments', ...S(['comment', 'punctuation.definition.comment', 'string.comment'], comment, 'italic') },
    { name: 'Comment keyword', ...S(['keyword.codetag', 'comment keyword.other', 'storage.type.class.jsdoc'], builtin, 'italic bold') },
    { name: 'Markup heading', ...S(['markup.heading', 'entity.name.section'], def, 'bold') },
    { name: 'Markup link', ...S(['markup.underline.link'], builtin, 'underline') },
    { name: 'Markup emphasis', ...S(['markup.italic'], fg, 'italic') },
    { name: 'Markup strong', ...S(['markup.bold'], fg, 'bold') },
    { name: 'Markup quote', ...S(['markup.quote'], comment, 'italic') },
    { name: 'Markup code', ...S(['markup.inline.raw', 'markup.fenced_code', 'markup.raw'], lit) },
    { name: 'Markup list', ...S(['markup.list', 'punctuation.definition.list.begin'], op) },
    { name: 'Diff inserted', ...S(['markup.inserted', 'meta.diff.header.to-file'], lit) },
    { name: 'Diff deleted', ...S(['markup.deleted', 'meta.diff.header.from-file'], frozen) },
    { name: 'Diff header', ...S(['meta.diff.header', 'meta.diff.range'], builtin) },
    { name: 'Invalid', ...S(['invalid', 'invalid.illegal'], frozen, 'underline') },
    { name: 'Deprecated, strikethrough', ...S(['invalid.deprecated'], op, 'strikethrough') },
    { name: 'Shell variables', ...S(['variable.other.normal.shell', 'punctuation.definition.variable.shell'], frozen) },
    { name: 'YAML keys', ...S(['entity.name.tag.yaml', 'support.type.property-name.yaml'], def) },
  ];
}

export function semanticTokenColors(p) {
  const { def, builtin, frozen, lit, dim, fg, comment, op } = ink(p);
  const bold = (foreground) => ({ foreground, fontStyle: 'bold' });
  const it = (foreground) => ({ foreground, fontStyle: 'italic' });
  return {
    '*.declaration': bold(def), '*.definition': bold(def), '*.defaultLibrary': it(builtin),
    '*.readonly': frozen, '*.static': frozen, '*.async': { fontStyle: 'italic' },
    '*.deprecated': { foreground: comment, fontStyle: 'strikethrough' },
    variable: fg, parameter: it(fg), property: fg, function: fg, method: fg, event: fg,
    class: fg, interface: fg, enum: fg, struct: fg, type: fg, namespace: fg,
    typeParameter: it(fg), macro: def, decorator: it(builtin),
    'variable.readonly': frozen, 'property.readonly': frozen, enumMember: frozen,
    'variable.declaration': bold(def), 'function.declaration': bold(def), 'method.declaration': bold(def),
    'class.declaration': bold(def), 'interface.declaration': bold(def), 'enum.declaration': bold(def),
    'type.declaration': bold(def), 'struct.declaration': bold(def), 'namespace.declaration': bold(def),
    'function.defaultLibrary': it(builtin), 'variable.defaultLibrary': it(builtin),
    'class.defaultLibrary': it(builtin), 'type.defaultLibrary': it(builtin),
    label: fg, constant: frozen, builtinConstant: it(builtin), path: lit,
    punctuations: op, parenthesis: op, bracket: op, curlybrace: op, semicolon: op, colon: op,
    '*.static': frozen, '*.abstract': { fontStyle: 'italic' },
    '*.documentation': it(comment), '*.builtin': it(builtin), '*.typeHint': it(builtin),
    keyword: dim, modifier: dim, operator: dim,
    string: lit, number: lit, regexp: lit, comment: it(comment),
  };
}
