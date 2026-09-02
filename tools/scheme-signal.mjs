import { buildFrom, styled, outputRules } from './scheme-kit.mjs';

const roles = (p) => ({
  scraped: p.keyword, lit: p.number, name: p.fg, deep: p.func,
  aside: p.type, comment: p.comment, op: p.op, mark: p.tag,
});

export function tokenColors(p) {
  const r = roles(p);
  const map = {
    comment: styled(r.comment, 'italic'), codetag: styled(r.mark, 'italic bold'),
    identifier: r.name, call: r.name, parameter: styled(r.name, 'italic'),
    definition: styled(r.deep, 'bold'), typedef: styled(r.deep, 'bold'),
    type: styled(r.scraped, 'italic'), builtin: styled(r.aside, 'italic'), frozen: r.lit,
    string: r.lit, number: r.lit, regexp: r.lit, regexpop: r.scraped,
    keyword: r.scraped, effect: r.aside, import: styled(r.scraped, 'italic'), arrow: r.scraped,
    operator: r.op, tag: r.deep, component: styled(r.deep, 'bold'),
    attribute: styled(r.scraped, 'italic'), decorator: styled(r.scraped, 'italic'),
    cssSelector: r.deep, cssProp: r.name, cssValue: r.lit, dataKey: r.deep, dataValue: r.lit,
    heading: styled(r.deep, 'bold'), link: styled(r.aside, 'underline'),
    emphasis: styled(r.name, 'italic'), strong: styled(r.name, 'bold'),
    quote: styled(r.comment, 'italic'), code: r.lit, list: r.op,
    added: r.lit, deleted: r.mark, diffHeader: r.aside, shellVar: r.name,
    invalid: styled(r.mark, 'underline'), deprecated: styled(r.op, 'strikethrough'),
  };
  return [...buildFrom((slot) => map[slot]), ...outputRules(p.st, p.op, p.bg)];
}

export function semanticTokenColors(p) {
  const r = roles(p);
  const it = (foreground) => ({ foreground, fontStyle: 'italic' });
  const bold = (foreground) => ({ foreground, fontStyle: 'bold' });
  return {
    '*.declaration': bold(r.deep), '*.definition': bold(r.deep), '*.defaultLibrary': it(r.aside),
    '*.deprecated': { foreground: r.op, fontStyle: 'strikethrough' },
    variable: r.name, parameter: it(r.name), property: r.name, function: r.name, method: r.name,
    class: r.name, interface: r.name, enum: r.name, struct: r.name, event: r.name,
    type: it(r.scraped), typeParameter: it(r.scraped), namespace: it(r.scraped),
    'variable.readonly': r.lit, 'property.readonly': r.lit, enumMember: r.lit,
    macro: bold(r.deep), decorator: it(r.scraped),
    label: r.name, constant: r.lit, builtinConstant: it(r.aside),
    punctuations: r.op, parenthesis: r.op, bracket: r.op, curlybrace: r.op, semicolon: r.op, colon: r.op,
    '*.static': r.lit, '*.abstract': it(r.aside), '*.async': { fontStyle: 'italic' },
    '*.modification': bold(r.name), '*.documentation': it(r.comment),
    '*.builtin': it(r.aside), '*.typeHint': it(r.scraped),
    keyword: r.scraped, modifier: r.scraped, operator: r.op,
    string: r.lit, number: r.lit, regexp: r.lit, comment: it(r.comment),
  };
}
