import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchFeatures } from '../api'
import type { CampusFeature, CampusMapApi } from '../api'

interface SearchBarProps {
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  onBuildingSelect: (feature: CampusFeature) => void
}

export default function SearchBar({ mapContainerRef, onBuildingSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [features, setFeatures] = useState<CampusFeature[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  /* ── Load named features (buildings, entrances, …) once ── */
  useEffect(() => {
    fetchFeatures()
      .then((data) => setFeatures(data.filter((f) => f.properties.name)))
      .catch(() => {})
  }, [])

  /* ── Filter features by query ── */
  const results = query.trim().length >= 2
    ? features.filter((f) => {
        const name = (f.properties.name ?? '').toLowerCase()
        const q = query.trim().toLowerCase()
        return name.includes(q)
      })
    : []

  /* ── Fly to feature on result click ── */
  const handleSelect = useCallback(
    (feature: CampusFeature) => {
      const api = mapContainerRef.current as unknown as CampusMapApi | null
      if (api?.__campusFlyToFeature) {
        api.__campusFlyToFeature(feature.properties.id)
      }
      onBuildingSelect(feature)
      setQuery('')
      setIsOpen(false)
      setHighlightedIndex(-1)
      inputRef.current?.blur()
    },
    [mapContainerRef, onBuildingSelect],
  )

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex])
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
      }
    },
    [isOpen, results, highlightedIndex, handleSelect],
  )

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-bar-input-wrap">
        <svg className="search-bar-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          className="search-bar-input"
          type="text"
          placeholder="Search campus locations…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search campus locations"
          aria-expanded={isOpen && results.length > 0}
          role="combobox"
          aria-autocomplete="list"
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              setHighlightedIndex(-1)
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-bar-results" role="listbox">
          {results.map((feature, i) => (
            <button
              key={feature.properties.id}
              className={`search-bar-result ${i === highlightedIndex ? 'search-bar-result--active' : ''}`}
              role="option"
              aria-selected={i === highlightedIndex}
              onClick={() => handleSelect(feature)}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              <svg className="search-bar-result-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1C4.5 1 2.5 3 2.5 5.5C2.5 9 7 13 7 13S11.5 9 11.5 5.5C11.5 3 9.5 1 7 1Z" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="7" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="search-bar-result-name">{feature.properties.name}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="search-bar-results">
          <div className="search-bar-empty">No matching locations</div>
        </div>
      )}
    </div>
  )
}
