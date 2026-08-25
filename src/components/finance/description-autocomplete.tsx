'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { History, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from './category-icon';
import type { ExpenseCategory, TransactionDescriptionSuggestion } from '@/types/finance';

type DescriptionAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (suggestion: TransactionDescriptionSuggestion) => void;
  suggestions: TransactionDescriptionSuggestion[];
  categoriesMap?: Map<string, ExpenseCategory>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
};

function highlightMatch(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <span key={index} className="font-bold text-foreground underline decoration-primary/40 underline-offset-2">
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function DescriptionAutocomplete({
  id = 'description',
  value,
  onChange,
  onSelectSuggestion,
  suggestions,
  categoriesMap,
  placeholder = 'Descripción',
  disabled = false,
  className,
  autoFocus,
}: DescriptionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const trimmedQuery = value.trim().toLowerCase();

  const filteredSuggestions = useMemo(() => {
    if (!trimmedQuery || !suggestions.length) return [];

    const matches = suggestions.filter((item) =>
      item.description.toLowerCase().includes(trimmedQuery),
    );

    // If there's only 1 match and it's identical to current input, don't show suggestion dropdown
    if (matches.length === 1 && matches[0].description.toLowerCase() === trimmedQuery) {
      return [];
    }

    // Rank suggestions:
    // 1. Starts with query
    // 2. Contains word starting with query
    // 3. Substring match
    // Tiebreak by usage count (descending) and recency
    return matches
      .sort((a, b) => {
        const aLower = a.description.toLowerCase();
        const bLower = b.description.toLowerCase();
        const aStarts = aLower.startsWith(trimmedQuery);
        const bStarts = bLower.startsWith(trimmedQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aWordMatch = aLower.includes(` ${trimmedQuery}`);
        const bWordMatch = bLower.includes(` ${trimmedQuery}`);
        if (aWordMatch && !bWordMatch) return -1;
        if (!aWordMatch && bWordMatch) return 1;

        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
      })
      .slice(0, 5);
  }, [suggestions, trimmedQuery]);

  const shouldShowDropdown = isOpen && filteredSuggestions.length > 0;

  // Handle outside click / touch to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = (item: TransactionDescriptionSuggestion) => {
    onChange(item.description);
    onSelectSuggestion?.(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowDropdown) {
      if (event.key === 'ArrowDown' && filteredSuggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
        );
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          event.preventDefault();
          handleSelect(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={shouldShowDropdown}
        aria-autocomplete="list"
        aria-controls={shouldShowDropdown ? listboxId : undefined}
        aria-activedescendant={
          highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
        }
        className={className}
      />

      {shouldShowDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-30 max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
            <span>Sugerencias anteriores</span>
            <span>{filteredSuggestions.length}</span>
          </div>

          <div className="space-y-0.5">
            {filteredSuggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex;
              const category = item.categoryId && categoriesMap ? categoriesMap.get(item.categoryId) : null;

              return (
                <button
                  key={`${item.description}-${index}`}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur before click is handled
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    isHighlighted
                      ? 'bg-primary/15 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <History className={`h-3.5 w-3.5 shrink-0 ${isHighlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate text-foreground font-medium">
                      {highlightMatch(item.description, value)}
                    </span>
                  </div>

                  {category && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {category.slug ? (
                        <CategoryIcon slug={category.slug} className="h-3 w-3" />
                      ) : (
                        <Tag className="h-3 w-3" />
                      )}
                      <span className="max-w-[100px] truncate">{category.name}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
