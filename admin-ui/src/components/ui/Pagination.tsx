interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted">
        {total} result{total !== 1 ? "s" : ""}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>
          <span className="text-sm text-muted tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
