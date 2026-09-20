interface Props {
  page: number
  totalPages: number
  onPageChange(page: number): void
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null
  return <nav className="request-pagination" aria-label="Request pages">
    <button className="secondary-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
    <span>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
    <button className="secondary-button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
  </nav>
}
