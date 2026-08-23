export const SAMPLE = [
  [['com', '// resolve a register from disk, then collapse it']],
  [['kw', 'import'], ['op', ' { '], ['var', 'readFile'], ['op', ' } '], ['kw', 'from'], ['op', ' '], ['str', "'node:fs/promises'"], ['op', ';']],
  [],
  [['kw', 'const'], ['op', ' '], ['num', 'MAX_QUBITS'], ['op', ' = '], ['num', '1024'], ['op', ';']],
  [['kw', 'type'], ['op', ' '], ['type', 'Basis'], ['op', ' = '], ['str', "'computational'"], ['op', ' | '], ['str', "'hadamard'"], ['op', ';']],
  [],
  [['kw', 'export class'], ['op', ' '], ['type', 'Register'], ['op', ' '], ['kw', 'implements'], ['op', ' '], ['type', 'Iterable'], ['op', '<'], ['type', 'State'], ['op', '> {']],
  [['op', '  '], ['prop', '#states'], ['op', ' = '], ['kw', 'new'], ['op', ' '], ['type', 'Map'], ['op', '<'], ['type', 'string'], ['op', ', '], ['type', 'State'], ['op', '>();']],
  [],
  [['op', '  '], ['kw', 'constructor'], ['op', '('], ['kw', 'private'], ['op', ' '], ['param', 'size'], ['op', ': '], ['type', 'number'], ['op', ' = '], ['num', '8'], ['op', ') {']],
  [['op', '    '], ['kw', 'if'], ['op', ' ('], ['param', 'size'], ['op', ' > '], ['num', 'MAX_QUBITS'], ['op', ') '], ['kw', 'throw'], ['op', ' '], ['kw', 'new'], ['op', ' '], ['type', 'RangeError'], ['op', '('], ['str', '`too wide: ${'], ['param', 'size'], ['str', '}`'], ['op', ');']],
  [['op', '  }']],
  [],
  [['op', '  '], ['kw', 'async'], ['op', ' '], ['func', 'hydrate'], ['op', '('], ['param', 'path'], ['op', ': '], ['type', 'string'], ['op', '): '], ['type', 'Promise'], ['op', '<'], ['type', 'void'], ['op', '> {']],
  [['op', '    '], ['kw', 'const'], ['op', ' '], ['var', 'raw'], ['op', ' = '], ['kw', 'await'], ['op', ' '], ['func', 'readFile'], ['op', '('], ['param', 'path'], ['op', ', '], ['str', "'utf8'"], ['op', ');'], ['com', '  // TODO: stream']],
  [['op', '    '], ['type', 'JSON'], ['op', '.'], ['func', 'parse'], ['op', '('], ['var', 'raw'], ['op', ').'], ['prop', 'states'], ['op', '.'], ['func', 'forEach'], ['op', '(('], ['param', 's'], ['op', ') => '], ['kw', 'this'], ['op', '.'], ['prop', '#states'], ['op', '.'], ['func', 'set'], ['op', '('], ['param', 's'], ['op', '.'], ['prop', 'id'], ['op', ', '], ['param', 's'], ['op', '));']],
  [['op', '  }']],
  [],
  [['op', '  '], ['kw', 'get'], ['op', ' '], ['func', 'entropy'], ['op', '(): '], ['type', 'number'], ['op', ' {']],
  [['op', '    '], ['kw', 'return'], ['op', ' ['], ['op', '...'], ['kw', 'this'], ['op', '].'], ['func', 'reduce'], ['op', '(('], ['param', 'a'], ['op', ', '], ['param', 's'], ['op', ') => '], ['param', 'a'], ['op', ' - '], ['param', 's'], ['op', '.'], ['prop', 'amp'], ['op', ' * '], ['type', 'Math'], ['op', '.'], ['func', 'log2'], ['op', '('], ['param', 's'], ['op', '.'], ['prop', 'amp'], ['op', ' || '], ['num', '1'], ['op', '), '], ['num', '0'], ['op', ');']],
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
