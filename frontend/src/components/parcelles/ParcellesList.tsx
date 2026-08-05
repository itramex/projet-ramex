import React from 'react';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/common/Pagination';

type ParcellesListProps = {
  parcelles: any[];
  itemsPerPage?: number;
};

export const ParcellesList: React.FC<ParcellesListProps> = (
  { parcelles, itemsPerPage = 10 }
) => {
  const {
    currentPage,
    totalPages,
    firstItemIndex,
    lastItemIndex,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination({
    totalItems: parcelles.length,
    itemsPerPage,
  });

  const paginatedParcelles = parcelles.slice(firstItemIndex, lastItemIndex);

  return (
    <div className="parcelles-list">
      {paginatedParcelles.map((parcelle) => (
        <div key={parcelle.id} className="parcelle-item">
          <h3>{parcelle.name}</h3>
          <p>{parcelle.description}</p>
        </div>
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </div>
  );
};