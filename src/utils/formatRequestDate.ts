const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
})
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
})

export function formatRequestDate(timestamp: string, includeTime = false): string {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return includeTime ? dateTimeFormat.format(date) + ' UTC' : dateFormat.format(date)
}
