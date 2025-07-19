import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface EmailPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  emailsPerPage: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  isLoading?: boolean;
}

export function EmailPagination({
  currentPage,
  totalPages,
  totalCount,
  emailsPerPage,
  hasPrevious,
  hasNext,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  isLoading = false
}: EmailPaginationProps) {
  // Don't show pagination if there's only one page or no emails
  if (totalPages <= 1 || totalCount === 0) {
    return null;
  }

  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5; // Show max 5 page numbers
    
    if (totalPages <= maxVisible) {
      // If total pages is small, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination - show current page and neighbors
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push(-1); // -1 represents "..."
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push(-1); // -1 represents "..."
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center px-4 py-3 border-t bg-background">
      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPrevious || isLoading}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            page === -1 ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onGoToPage(page)}
                disabled={isLoading}
                className="min-w-[32px]"
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNext || isLoading}
          className="flex items-center gap-1"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}