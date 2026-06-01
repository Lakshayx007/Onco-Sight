import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function MultiSelectDropdown({ options, selected, onChange, placeholder = "Select options" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      if (selected.length > 1) {
        onChange(selected.filter(item => item !== option));
      }
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClearAll = () => {
    if (options.length > 0) {
      onChange([options[0]]); // Keep at least one selected, usually the primary/all
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex items-center justify-between w-full min-w-[200px] bg-surface border border-border text-primary px-3 py-1.5 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-2">
          {selected.length === options.length ? "All Subtypes" : 
           selected.length === 0 ? placeholder : 
           selected.length === 1 ? selected[0] : 
           `${selected.length} selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-muted shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-[320px] max-w-[90vw] mt-1 bg-surface border border-border rounded-lg shadow-xl overflow-hidden right-0">
          <div className="flex items-center justify-between p-2 border-b border-border bg-background/50">
            <button 
              type="button"
              className="text-xs font-semibold text-blue-500 hover:text-blue-400 px-2 py-1 rounded"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button 
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary px-2 py-1 rounded"
              onClick={handleClearAll}
            >
              Clear
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <div
                  key={option}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md transition-colors ${
                    isSelected ? 'bg-accent/10' : 'hover:bg-background'
                  }`}
                  onClick={() => toggleOption(option)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-accent border-accent text-white' : 'border-muted'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className={`text-sm ${isSelected ? 'font-medium text-primary' : 'text-muted'}`}>
                    {option}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
