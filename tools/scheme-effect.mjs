import { buildFrom, styled } from './scheme-kit.mjs';

const roles = (p) => ({
  hot: p.number, warm: p.tag, cool: p.func, calm: p.string, still: p.type,
  fg: p.fg, dim: p.keyword, comment: p.comment, op: p.op,
});

export function tokenColors(p) {
  const r = roles(p);
  const map = {
    comment: styled(r.comment, 'italic'), codetag: styled(r.hot, 'italic bold'),
    identifier: r.fg, call: r.cool, parameter: styled(r.fg, 'italic'),
    definition: r.cool, typedef: r.still, type: r.still, builtin: styled(r.still, 'italic'),
    frozen: r.calm, string: r.calm, number: r.calm, regexp: r.calm, regexpop: r.op,
    keyword: r.dim, effect: styled(r.hot, 'bold'), import: r.dim, arrow: r.dim, operator: r.op,
    tag: r.still, component: r.cool, attribute: styled(r.still, 'italic'), decorator: styled(r.warm, 'italic'),
    cssSelector: r.cool, cssProp: r.fg, cssValue: r.calm, dataKey: r.cool, dataValue: r.calm,
    heading: styled(r.cool, 'bold'), link: styled(r.still, 'underline'),
    emphasis: styled(r.fg, 'italic'), strong: styled(r.fg, 'bold'), quote: styled(r.comment, 'italic'),
    code: r.calm, list: r.op, added: r.calm, deleted: r.hot, diffHeader: r.still,
    shellVar: r.warm, invalid: styled(r.hot, 'underline'), deprecated: styled(r.op, 'strikethrough'),
  };
  return buildFrom((slot) => map[slot]);
}

export function semanticTokenColors(p) {
  const r = roles(p);
  const it = (foreground) => ({ foreground, fontStyle: 'italic' });
  const bold = (foreground) => ({ foreground, fontStyle: 'bold' });
  return {
    '*.async': bold(r.hot), '*.modification': r.warm, '*.defaultLibrary': it(r.still),
    '*.readonly': r.calm, '*.static': r.calm,
    '*.deprecated': { foreground: r.op, fontStyle: 'strikethrough' },
    variable: r.fg, parameter: it(r.fg), property: r.fg, 'variable.readonly': r.calm,
    'property.readonly': r.calm, enumMember: r.calm,
    function: r.cool, 'function.async': bold(r.hot), method: r.cool, 'method.async': bold(r.hot),
    class: r.still, interface: r.still, enum: r.still, struct: r.still, type: r.still,
    typeParameter: it(r.still), namespace: r.still, macro: r.warm, decorator: it(r.warm), event: r.warm,
    label: r.fg, constant: r.calm, builtinConstant: it(r.still),
    punctuations: r.op, parenthesis: r.op, bracket: r.op, curlybrace: r.op, semicolon: r.op, colon: r.op,
    '*.declaration': bold(r.cool), '*.static': r.calm, '*.abstract': it(r.still), '*.documentation': it(r.comment),
    '*.builtin': it(r.still), '*.typeHint': r.still,
    keyword: r.dim, modifier: r.dim, operator: r.op,
    string: r.calm, number: r.calm, regexp: r.calm, comment: it(r.comment),
  };
}
