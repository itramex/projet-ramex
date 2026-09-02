# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.org/) (or [oxc](https://oxc.rs/) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/template-react-ts) for information about how to integrate TypeScript with [`typescript-eslint`](https://typescript-eslint.org/) in your project.

## Tests (Vitest + Testing Library)

Configuration dans `vite.config.js` :

- environnement `jsdom`, `setupFiles: ./src/test/setup.js` (jest-dom)
- si `NODE_ENV=production` est défini globalement (fréquent sur certains postes Windows), il est forcé à `test` sous Vitest — sinon React charge sa build production et `@testing-library/react` échoue avec `React.act is not a function`

```bash
npm test        # mode watch (vitest)
npx vitest run  # exécution unique
```

Tests actuels (`src/test/`) :

- `apiCache.test.js` — cache axios GET : hit/miss, clés par URL + params, TTL par défaut (5 min) et personnalisé (`cacheTTL`), non-cache des réponses en erreur, invalidation par préfixe et globale
- `Badge.test.jsx` — composant `Badge` : contenu, variantes (success/error/neutral par défaut), tailles, props HTML, fusion de className
