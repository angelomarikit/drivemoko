export function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    weekday: get('weekday'),
  }
}

export function manilaYmd(date = new Date()) {
  const { year, month, day } = manilaParts(date)
  return `${year}-${month}-${day}`
}

export function manilaTime(date = new Date()) {
  const { hour, minute } = manilaParts(date)
  return `${hour}:${minute}`
}

export function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function diffDays(start: string, end: string) {
  const [ys, ms, ds] = start.split('-').map(Number)
  const [ye, me, de] = end.split('-').map(Number)
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000)
}

export function formatPretty(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatMonthDay(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatWeekday(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}

export function formatTime(hm: string) {
  const [hourRaw, minuteRaw] = hm.split(':').map(Number)
  const suffix = hourRaw >= 12 ? 'PM' : 'AM'
  const hour = hourRaw % 12 || 12
  return `${hour}:${String(minuteRaw).padStart(2, '0')} ${suffix}`
}

export function formatManilaStamp(date = new Date()) {
  const { weekday } = manilaParts(date)
  const ymd = manilaYmd(date)
  return {
    date: formatPretty(ymd),
    time: `${weekday}, ${formatTime(manilaTime(date))}`,
  }
}

export function monthMeta(year: number, month: number) {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { firstDow, days }
}

export function rangesOverlap(start: string, end: string, otherStart: string, otherEnd: string) {
  return start < otherEnd && otherStart < end
}

export function eachDate(start: string, endExclusive: string) {
  const dates: string[] = []
  let cursor = start
  while (cursor < endExclusive) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}
