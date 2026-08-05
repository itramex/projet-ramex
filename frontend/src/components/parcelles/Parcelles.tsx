import React from 'react';
import { ParcellesList } from './ParcellesList';

type ParcellesProps = {
  parcelles: any[];
  itemsPerPage?: number;
};

export const Parcelles: React.FC<ParcellesProps> = (
  { parcelles, itemsPerPage = 10 }
) => {
  return (
    <div className="parcelles-container">
      <h2>Parcelles</h2>
      <ParcellesList parcelles={parcelles} itemsPerPage={itemsPerPage} />
    </div>
  );
};