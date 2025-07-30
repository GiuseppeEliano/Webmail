import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface EmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function EmailInput({ emails, onChange, placeholder, className, onFocus, onBlur }: EmailInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) return;
    
    if (!validateEmail(trimmedEmail)) {
      // Could add error handling here
      return;
    }
    
    // Check for duplicates
    if (emails.some(existingEmail => existingEmail.toLowerCase() === trimmedEmail)) {
      setInputValue("");
      return;
    }
    
    onChange([...emails, trimmedEmail]);
    setInputValue("");
  };

  const removeEmail = (indexToRemove: number) => {
    onChange(emails.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent keyboard shortcuts from triggering
    
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
    onBlur?.();
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1 p-2 bg-background cursor-text min-h-[40px] ${className}`}
      onClick={handleContainerClick}
    >
      {emails.map((email, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
        >
          <span className="max-w-[150px] truncate">{email}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeEmail(index);
            }}
            className="ml-1 hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsInputFocused(true);
          onFocus?.();
        }}
        onBlur={handleBlur}
        placeholder={emails.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 pl-1 pr-0 py-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none !border-transparent focus:!border-transparent outline-none"
        style={{ 
          direction: 'ltr', 
          textAlign: 'left', 
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
      />
    </div>
  );
}