export const SAMPLE = [
  [['comment', '// resolve a register from disk, then collapse it']],
  [['keyword', 'import'], ['op', ' { '], ['variable', 'readFile'], ['op', ' } '], ['keyword', 'from'], ['op', ' '], ['string', "'node:fs/promises'"], ['op', ';']],
  [],
  [['keyword', 'const'], ['op', ' '], ['number', 'MAX_QUBITS'], ['op', ' = '], ['number', '1024'], ['op', ';']],
  [['keyword', 'type'], ['op', ' '], ['type', 'Basis'], ['op', ' = '], ['string', "'computational'"], ['op', ' | '], ['string', "'hadamard'"], ['op', ';']],
  [],
  [['keyword', 'export class'], ['op', ' '], ['type', 'Register'], ['op', ' '], ['keyword', 'implements'], ['op', ' '], ['type', 'Iterable'], ['op', '<'], ['type', 'State'], ['op', '> {']],
  [['op', '  '], ['prop', '#states'], ['op', ' = '], ['keyword', 'new'], ['op', ' '], ['type', 'Map'], ['op', '<'], ['type', 'string'], ['op', ', '], ['type', 'State'], ['op', '>();']],
  [],
  [['op', '  '], ['keyword', 'constructor'], ['op', '('], ['keyword', 'private'], ['op', ' '], ['param', 'size'], ['op', ': '], ['type', 'number'], ['op', ' = '], ['number', '8'], ['op', ') {']],
  [['op', '    '], ['keyword', 'if'], ['op', ' ('], ['param', 'size'], ['op', ' > '], ['number', 'MAX_QUBITS'], ['op', ') '], ['keyword', 'throw'], ['op', ' '], ['keyword', 'new'], ['op', ' '], ['type', 'RangeError'], ['op', '('], ['string', '`too wide: ${'], ['param', 'size'], ['string', '}`'], ['op', ');']],
  [['op', '  }']],
  [],
  [['op', '  '], ['keyword', 'async'], ['op', ' '], ['func', 'hydrate'], ['op', '('], ['param', 'path'], ['op', ': '], ['type', 'string'], ['op', '): '], ['type', 'Promise'], ['op', '<'], ['type', 'void'], ['op', '> {']],
  [['op', '    '], ['keyword', 'const'], ['op', ' '], ['variable', 'raw'], ['op', ' = '], ['keyword', 'await'], ['op', ' '], ['func', 'readFile'], ['op', '('], ['param', 'path'], ['op', ', '], ['string', "'utf8'"], ['op', ');'], ['comment', '  // TODO: stream']],
  [['op', '    '], ['type', 'JSON'], ['op', '.'], ['func', 'parse'], ['op', '('], ['variable', 'raw'], ['op', ').'], ['prop', 'states'], ['op', '.'], ['func', 'forEach'], ['op', '(('], ['param', 's'], ['op', ') => '], ['keyword', 'this'], ['op', '.'], ['prop', '#states'], ['op', '.'], ['func', 'set'], ['op', '('], ['param', 's'], ['op', '.'], ['prop', 'id'], ['op', ', '], ['param', 's'], ['op', '));']],
  [['op', '  }']],
  [],
  [['op', '  '], ['keyword', 'get'], ['op', ' '], ['func', 'entropy'], ['op', '(): '], ['type', 'number'], ['op', ' {']],
  [['op', '    '], ['keyword', 'return'], ['op', ' ['], ['op', '...'], ['keyword', 'this'], ['op', '].'], ['func', 'reduce'], ['op', '(('], ['param', 'a'], ['op', ', '], ['param', 's'], ['op', ') => '], ['param', 'a'], ['op', ' - '], ['param', 's'], ['op', '.'], ['prop', 'amp'], ['op', ' * '], ['type', 'Math'], ['op', '.'], ['func', 'log2'], ['op', '('], ['param', 's'], ['op', '.'], ['prop', 'amp'], ['op', ' || '], ['number', '1'], ['op', '), '], ['number', '0'], ['op', ');']],
  [['op', '  }']],
  [['op', '}']],
];

export const TREE = [
  { d: 1, n: 'src', dir: true },
  { d: 2, n: 'register.ts', active: true, git: 'mod' },
  { d: 2, n: 'gates.ts' },
  { d: 2, n: 'basis.ts', git: 'add' },
  { d: 1, n: 'themes', dir: true },
  { d: 2, n: 'dark.json' },
  { d: 1, n: 'package.json' },
];

export const TABS = ['register.ts', 'gates.ts', 'package.json'];
