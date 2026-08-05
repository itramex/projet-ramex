import { useState } from 'react';

type UsePaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
};

type UsePaginationReturn = {
  currentPage: number;
  totalPages: number;
  firstItemIndex: number;
  lastItemIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
};

export const usePagination = (
  { totalItems, itemsPerPage, initialPage = 1 }: UsePaginationProps
): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const prevPage = () => {
    goToPage(currentPage - 1);
  };

  const firstItemIndex = (currentPage - 1) * itemsPerPage;
  const lastItemIndex = Math.min(firstItemIndex + itemsPerPage, totalItems);

  return {
    currentPage,
    totalPages,
    firstItemIndex,
    lastItemIndex,
    goToPage,
    nextPage,
    prevPage,
  };
};
