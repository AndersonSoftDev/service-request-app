interface Props {
  page: number
  totalPages: number
  onPageChange(page: number): void
}

const MAX_PAGE_BUTTONS = 5

// A short window of page numbers keeps the control compact on every screen.
function pageWindow(page: number, totalPages: number): number[] {
  const count = Math.min(MAX_PAGE_BUTTONS, totalPages)
  const first = Math.max(1, Math.min(page - Math.floor(count / 2), totalPages - count + 1))
  return Array.from({ length: count }, (_, index) => first + index)
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null
  return <nav className="request-pagination" aria-label="Request pages">
    <button className="pagination-step" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
    <ul className="pagination-pages">
      {pageWindow(page, totalPages).map((number) => <li key={number}>
        <button className={number === page ? 'pagination-page is-current' : 'pagination-page'}
          aria-label={'Page ' + number} aria-current={number === page ? 'page' : undefined}
          onClick={() => onPageChange(number)}>{number}</button>
      </li>)}
    </ul>
    <span className="pagination-status">Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
    <button className="pagination-step" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
  </nav>
}
