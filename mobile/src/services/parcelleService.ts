/**
 * Service API Parcelles — endpoints DRF /api/parcelles/ (recherche + pagination + détail).
 */
import api from './api';
import { Paginated } from '../types/api';
import { Parcelle } from '../types/parcelle';

export interface ParcelleListParams {
  page?: number;
  page_size?: number;
  search?: string;
  active?: string;
  producteur?: string;
  certifiee?: string;
}

export const parcelleService = {
  list: (params: ParcelleListParams = {}) =>
    api.get<Paginated<Parcelle>>('/parcelles/', { params }),
  detail: (id: number | string) => api.get<Parcelle>(`/parcelles/${id}/`),
};