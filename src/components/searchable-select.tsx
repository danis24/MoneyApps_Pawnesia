"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Check } from "lucide-react";

interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  dropdownWidth?: string;
  triggerMaxWidth?: string;
}

export function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onValueChange,
  className,
  dropdownWidth,
  triggerMaxWidth
}: SearchableSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;

    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(option => option.value === value);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Use setTimeout to ensure the dropdown is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    }
  }, [isOpen]);

  return (
    <div className={className}>
      <Label htmlFor={`select-${label}`}>{label}</Label>
      <Select
        value={value}
        onValueChange={(newValue) => {
          onValueChange(newValue);
          setSearchTerm("");
          setIsOpen(false);
        }}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className={`w-full min-h-[60px] ${triggerMaxWidth || ''}`}>
          <SelectValue placeholder={placeholder}>
            {selectedOption ? (
              <div className="flex flex-col items-start w-full pr-8">
                <div className="font-medium text-sm break-words whitespace-normal leading-tight line-clamp-2">
                  {selectedOption.label}
                </div>
                {selectedOption.description && (
                  <div className="text-xs text-muted-foreground mt-1 break-words whitespace-normal leading-tight line-clamp-1">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={`${dropdownWidth || 'min-w-[350px] max-w-[450px]'} max-h-80`}>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tidak ada hasil ditemukan
              </div>
            ) : (
              filteredOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="py-3"
                  onSelect={() => {
                    onValueChange(option.value);
                    setSearchTerm("");
                    setIsOpen(false);
                  }}
                >
                  <div className="flex flex-col w-full">
                    <div className="font-medium text-sm flex items-start gap-2 break-words whitespace-normal leading-tight">
                      <span className="flex-1">{option.label}</span>
                      {value === option.value && (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground mt-1 break-words whitespace-normal leading-tight">
                        {option.description}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}