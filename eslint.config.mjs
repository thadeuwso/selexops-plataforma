import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import next from '@next/eslint-plugin-next';
import path from 'node:path';

/**
 * ESLint do monorepo (flat config, ESLint 9).
 *
 * Substitui o `next lint`, que era o único script de lint do projeto e nunca
 * rodou de fato: em Next 15 ele está depreciado e abre um assistente
 * interativo, o que fazia o comando falhar sempre — inclusive no CI, se algum
 * dia tivesse sido chamado lá. Agora é o ESLint CLI direto, um config só para
 * api e web, e o CI chama.
 *
 * As regras seguem os padrões recomendados. As poucas customizações abaixo
 * existem para casar com convenções que o projeto já usa de propósito.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/generated/**',
      'packages/database/prisma/migrations/**',
      // Kit do AION Design Language — código de terceiro, vendorizado.
      'packages/ui/adl/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      // Parâmetro/variável com prefixo `_` é descarte intencional.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Frontend: React 19 + App Router.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': next },
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: {
      // Caminho absoluto, não relativo: o lint roda tanto da raiz (`pnpm lint`)
      // quanto de dentro de `apps/web` (turbo), e um caminho relativo só acerta
      // num dos dois — no outro o plugin não acha `pages/` e avisa a cada execução.
      next: { rootDir: path.join(import.meta.dirname, 'apps/web') },
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,

      // Todo `<img>` do projeto é o logo da marca em SVG, com altura fixa.
      // `next/image` não otimiza SVG (exigiria `dangerouslyAllowSVG`) e não há
      // ganho de LCP a obter — a regra seria 100% falso positivo, e aviso que
      // ninguém pode resolver ensina a ignorar o lint. Reativar se algum dia
      // entrar imagem rasterizada (foto de candidato, anexo renderizado).
      '@next/next/no-img-element': 'off',
    },
  },

  // Scripts de fumaça e utilitários: JS puro, sem checagem de tipos.
  {
    files: ['**/*.mjs', '**/scripts/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Testes: `expect(...)` encadeado dispara no-unused-expressions à toa.
  {
    files: ['**/*.spec.ts'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
);
