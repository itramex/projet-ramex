import React from 'react';

function AdhesionsHistoryViewSimple() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Test: Historique des Adhésions</h2>
      <p className="text-gray-600">
        Si vous voyez ce message, le composant se charge correctement.
      </p>
      <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded">
        <p className="text-blue-800">
          ✓ Le composant est monté
        </p>
        <p className="text-blue-800">
          ✓ Le JSX fonctionne
        </p>
        <p className="text-blue-800">
          ✓ Les styles Tailwind fonctionnent
        </p>
      </div>
    </div>
  );
}

export default AdhesionsHistoryViewSimple;
