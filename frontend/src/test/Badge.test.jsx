import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '../components/common/Badge';

describe('Badge', () => {
  it('affiche son contenu', () => {
    render(<Badge>Actif</Badge>);
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('applique les classes de la variante success', () => {
    render(<Badge variant="success">Validé</Badge>);
    const badge = screen.getByText('Validé');
    expect(badge).toHaveClass('bg-green-50', 'text-green-700');
  });

  it('applique les classes de la variante error', () => {
    render(<Badge variant="error">Rejeté</Badge>);
    const badge = screen.getByText('Rejeté');
    expect(badge).toHaveClass('bg-red-50', 'text-red-700');
  });

  it('applique la variante neutral par défaut', () => {
    render(<Badge>Neutre</Badge>);
    const badge = screen.getByText('Neutre');
    expect(badge).toHaveClass('bg-gray-50', 'text-gray-700');
  });

  it('applique les classes de taille sm', () => {
    render(<Badge size="sm">Petit</Badge>);
    expect(screen.getByText('Petit')).toHaveClass('text-xs');
  });

  it('transmet les props HTML supplémentaires', () => {
    render(<Badge data-testid="statut-badge">Test</Badge>);
    expect(screen.getByTestId('statut-badge')).toBeInTheDocument();
  });

  it('fusionne la className personnalisée', () => {
    render(<Badge className="ml-2">Avec marge</Badge>);
    expect(screen.getByText('Avec marge')).toHaveClass('ml-2');
  });
});
