import { buildFrom, styled, outputRules } from './scheme-kit.mjs';

const tones = (p) => ({
  t1: p.func, t2: p.keyword, t3: p.string, t4: p.type, t5: p.number, t6: p.tag,
  fg: p.fg, comment: p.comment, op: p.op,
});

export function tokenColors(p) {
  const t = tones(p);
  const map = {
    comment: styled(t.comment, 'italic'), codetag: styled(t.t1, 'italic bold'),
    identifier: t.fg, call: t.t3, parameter: styled(t.t4, 'italic'),
    definition: styled(t.t1, 'bold'), typedef: styled(t.t1, 'bold italic'),
    type: styled(t.t4, 'italic'), builtin: styled(t.t3, 'italic'), frozen: styled(t.t2, 'bold'),
    string: t.t3, number: styled(t.t5, 'bold'), regexp: styled(t.t5, 'italic'), regexpop: t.op,
    keyword: t.t2, effect: styled(t.t2, 'bold'), import: styled(t.t6, 'italic'), arrow: t.t2,
    operator: t.op, tag: styled(t.t1, 'bold'), component: styled(t.t1, 'bold'),
    attribute: styled(t.t4, 'italic'), decorator: styled(t.t6, 'italic'),
    cssSelector: styled(t.t1, 'bold'), cssProp: t.fg, cssValue: t.t3,
    dataKey: styled(t.t1, 'bold'), dataValue: t.t3,
    heading: styled(t.t1, 'bold'), link: styled(t.t3, 'underline'),
    emphasis: styled(t.fg, 'italic'), strong: styled(t.fg, 'bold'),
    quote: styled(t.comment, 'italic'), code: t.t3, list: t.op,
    added: styled(t.t3, 'bold'), deleted: styled(t.t5, 'italic'), diffHeader: t.t4,
    shellVar: styled(t.t2, 'bold'), invalid: styled(t.t5, 'underline'),
    deprecated: styled(t.op, 'strikethrough'),
  };
  return [...buildFrom((slot) => map[slot]), ...outputRules(p.st, p.op, p.bg)];
}

export function semanticTokenColors(p) {
  const t = tones(p);
  const it = (foreground) => ({ foreground, fontStyle: 'italic' });
  const bold = (foreground) => ({ foreground, fontStyle: 'bold' });
  return {
    '*.declaration': bold(t.t1), '*.definition': bold(t.t1), '*.defaultLibrary': it(t.t3),
    '*.readonly': bold(t.t2), '*.static': bold(t.t2),
    '*.deprecated': { foreground: t.op, fontStyle: 'strikethrough' },
    variable: t.fg, parameter: it(t.t4), property: t.fg, function: t.t3, method: t.t3,
    class: it(t.t1), interface: it(t.t1), enum: it(t.t1), struct: it(t.t1), type: it(t.t4),
    typeParameter: it(t.t4), namespace: it(t.t6), macro: bold(t.t1), decorator: it(t.t6), event: t.t3,
    enumMember: bold(t.t2), 'variable.readonly': bold(t.t2), 'property.readonly': bold(t.t2),
    label: t.fg, constant: bold(t.t2), builtinConstant: it(t.t3),
    punctuations: t.op, parenthesis: t.op, bracket: t.op, curlybrace: t.op, semicolon: t.op, colon: t.op,
    '*.abstract': it(t.t4), '*.async': { fontStyle: 'italic' }, '*.modification': bold(t.fg),
    '*.documentation': it(t.comment), '*.builtin': it(t.t3), '*.typeHint': it(t.t4),
    keyword: t.t2, modifier: t.t2, operator: t.op,
    string: t.t3, number: bold(t.t5), regexp: it(t.t5), comment: it(t.comment),
  };
}
