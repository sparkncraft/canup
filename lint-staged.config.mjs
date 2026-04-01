export default {
  '*.{ts,tsx,mts,cts}': ['eslint --fix', 'prettier --write'],
  '*.{json,yml,yaml,css}': ['prettier --write'],
  '**/*.ts?(x)': () => 'tsc -p tsconfig.json --noEmit',
};
