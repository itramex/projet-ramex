import { useState, useRef, useEffect, useMemo, useDeferredValue, useCallback, memo } from 'react';
import Icon from './Icon';

function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Rechercher...",
  displayKey = "label",
  valueKey = "value",
  className = "",
  multiple = false,
  disabled = false,
  maxHeight = "16rem" // 64 * 0.25rem = 16rem
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Mémoiser les options filtrées pour éviter les recalculs
  const filteredOptions = useMemo(() => {
    if (!deferredSearchTerm) return options;
    const searchLower = deferredSearchTerm.toLowerCase();
    return options.filter(option =>
      option[displayKey]?.toLowerCase().includes(searchLower)
    );
  }, [options, deferredSearchTerm, displayKey]);

  // Mémoiser le label sélectionné
  const selectedLabel = useMemo(() => {
    if (multiple) {
      if (!Array.isArray(value) || value.length === 0) return placeholder;
      if (value.length === 1) {
        const opt = options.find(o => o[valueKey] === value[0]);
        return opt ? opt[displayKey] : placeholder;
      }
      return `${value.length} sélectionné(s)`;
    } else {
      const selectedOption = options.find(opt => opt[valueKey] === value);
      return selectedOption ? selectedOption[displayKey] : placeholder;
    }
  }, [multiple, value, options, valueKey, displayKey, placeholder]);

  // Vérifier si une option est sélectionnée
  const isSelected = useCallback((optionValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  }, [multiple, value]);

  // Fermer quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Scroll automatique vers l'élément surligné
  useEffect(() => {
    if (isOpen && optionsListRef.current) {
      const highlightedElement = optionsListRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Réinitialiser l'index surligné quand les options changent
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // Navigation au clavier
  const handleKeyDown = useCallback((e) => {
    if (!isOpen && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex]);

  const handleSelect = useCallback((option) => {
    if (multiple) {
      const newValue = [...(Array.isArray(value) ? value : [])];
      const optionValue = option[valueKey];
      const index = newValue.indexOf(optionValue);

      if (index === -1) {
        newValue.push(optionValue);
      } else {
        newValue.splice(index, 1);
      }
      onChange(newValue);
      // Garder ouvert pour sélection multiple
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      onChange(option[valueKey]);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(0);
    }
  }, [multiple, value, valueKey, onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
    setSearchTerm('');
    if (!multiple) setIsOpen(false);
  }, [multiple, onChange]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [disabled, isOpen]);

  const hasValue = multiple ? (value && value.length > 0) : value;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input/Button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow bg-white text-left flex items-center justify-between transition-colors ${
            disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-gray-400'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={hasValue ? 'text-dark' : 'text-gray-400'}>
            {selectedLabel}
          </span>
          <div className="flex items-center gap-2">
            {hasValue && !disabled && (
              <span
                onClick={handleClear}
                className="text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
                title="Effacer la sélection"
              >
                <Icon name="XMarkIcon" size="sm" />
              </span>
            )}
            <Icon
              name="ChevronDownIcon"
              size="sm"
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
          style={{ maxHeight }}
        >
          {/* Search Input */}
          <div className="p-2 border-b sticky top-0 bg-white z-10">
            <div className="relative">
              <Icon 
                name="MagnifyingGlassIcon" 
                size="sm" 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Options List */}
          <div 
            ref={optionsListRef}
            className="overflow-y-auto"
            style={{ maxHeight: 'calc(16rem - 4rem)' }}
            role="listbox"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const selected = isSelected(option[valueKey]);
                return (
                  <button
                    key={option[valueKey]}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-4 py-2 text-left transition-colors flex items-center gap-2 ${
                      index === highlightedIndex ? 'bg-gray-100' : ''
                    } ${
                      selected && !multiple ? 'bg-primary-yellow text-dark font-semibold' : 'hover:bg-primary-yellow hover:text-dark'
                    }`}
                    role="option"
                    aria-selected={selected}
                  >
                    {multiple && (
                      <div 
                        className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'bg-primary-yellow border-primary-yellow' : 'border-gray-300'
                        }`}
                      >
                        {selected && (
                          <Icon name="CheckIcon" size="sm" className="text-white" />
                        )}
                      </div>
                    )}
                    <span className="truncate">{option[displayKey]}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <Icon name="MagnifyingGlassIcon" size="xl" className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Aucun résultat trouvé</p>
              </div>
            )}
          </div>

          {/* Footer avec compteur */}
          {filteredOptions.length > 0 && (
            <div className="p-2 border-t bg-gray-50 text-xs text-gray-600 text-center">
              {filteredOptions.length} résultat(s) sur {options.length}
              {multiple && hasValue && ` • ${value.length} sélectionné(s)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SearchableSelect);
