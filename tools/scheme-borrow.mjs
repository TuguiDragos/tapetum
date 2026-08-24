import { buildFrom, styled } from './scheme-kit.mjs';

const roles = (p) => ({
  frozen: p.keyword, mutable: p.number, borrowed: p.string, written: p.tag,
  own: p.func, lib: p.type, fg: p.fg, dim: p.op, comment: p.comment, op: p.op,
});

export function tokenColors(p) {
  const r = roles(p);
  const map = {
    comment: styled(r.comment, 'italic'), codetag: styled(r.written, 'italic bold'),
    identifier: r.mutable, call: r.fg, parameter: styled(r.borrowed, 'italic'),
    definition: styled(r.own, 'bold'), typedef: styled(r.own, 'bold'), type: styled(r.lib, 'italic'),
    builtin: styled(r.lib, 'italic'), frozen: r.frozen,
    string: r.dim, number: r.dim, regexp: r.dim, regexpop: r.op,
    keyword: r.dim, effect: r.written, import: r.dim, arrow: r.dim, operator: r.op,
    tag: r.own, component: styled(r.own, 'bold'), attribute: styled(r.borrowed, 'italic'),
    decorator: styled(r.lib, 'italic'), cssSelector: r.own, cssProp: r.mutable, cssValue: r.frozen,
    dataKey: r.own, dataValue: r.frozen, heading: styled(r.own, 'bold'),
    link: styled(r.lib, 'underline'), emphasis: styled(r.fg, 'italic'), strong: styled(r.fg, 'bold'),
    quote: styled(r.comment, 'italic'), code: r.frozen, list: r.op,
    added: r.borrowed, deleted: r.written, diffHeader: r.lib, shellVar: r.mutable,
    invalid: styled(r.written, 'underline'), deprecated: styled(r.op, 'strikethrough'),
  };
  return buildFrom((slot) => map[slot]);
}

export function semanticTokenColors(p) {
  const r = roles(p);
  const it = (foreground) => ({ foreground, fontStyle: 'italic' });
  const bold = (foreground) => ({ foreground, fontStyle: 'bold' });
  return {
    '*.readonly': r.frozen, '*.static': r.frozen, '*.modification': bold(r.written),
    '*.declaration': bold(r.own), '*.definition': bold(r.own), '*.defaultLibrary': it(r.lib),
    '*.deprecated': { foreground: r.op, fontStyle: 'strikethrough' },
    variable: r.mutable, 'variable.readonly': r.frozen, 'variable.declaration': bold(r.own),
    parameter: it(r.borrowed), 'parameter.readonly': it(r.frozen),
    property: r.mutable, 'property.readonly': r.frozen, enumMember: r.frozen,
    function: r.fg, 'function.declaration': bold(r.own), method: r.fg, 'method.declaration': bold(r.own),
    class: r.fg, 'class.declaration': bold(r.own), interface: r.fg, enum: r.fg, struct: r.fg,
    type: it(r.lib), typeParameter: it(r.borrowed), namespace: r.lib, macro: r.own,
    decorator: it(r.lib), event: r.written,
    label: r.fg, constant: r.frozen, builtinConstant: it(r.lib),
    punctuations: r.op, parenthesis: r.op, bracket: r.op, curlybrace: r.op, semicolon: r.op, colon: r.op,
    '*.abstract': it(r.lib), '*.async': { fontStyle: 'italic' }, '*.documentation': it(r.comment),
    '*.builtin': it(r.lib), '*.typeHint': it(r.lib),
    keyword: r.dim, modifier: r.frozen, operator: r.op,
    string: r.dim, number: r.dim, regexp: r.dim, comment: it(r.comment),
  };
}
