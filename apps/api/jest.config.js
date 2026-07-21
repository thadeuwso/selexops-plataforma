/**
 * Testes unitários dos motores de cálculo determinísticos (match e comportamental).
 * Só funções puras: nada aqui toca banco, rede ou Nest — a cobertura de integração
 * é a fumaça (`scripts/fumaca-core.mjs`), que exercita a API real.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
};
