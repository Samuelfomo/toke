const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
const dateLabel = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })

export function suggestionWeeks(from: string, to: string, lastScheduleDate: string) {
  const monday = new Date(`${from}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  const last = lastScheduleDate > to ? lastScheduleDate : to
  const weeks: Array<Array<{
    iso: string
    shortLabel: string
    dayMonth: string
    weekend: boolean
    inPeriod: boolean
    spillover: boolean
  }>> = []

  while (monday.toISOString().slice(0, 10) <= last) {
    weeks.push(Array.from({ length: 7 }, () => {
      const iso = monday.toISOString().slice(0, 10)
      const day = {
        iso,
        shortLabel: dayLabel.format(monday).replace('.', ''),
        dayMonth: dateLabel.format(monday),
        weekend: monday.getUTCDay() === 0 || monday.getUTCDay() === 6,
        inPeriod: iso >= from && iso <= to,
        spillover: iso > to && iso <= last,
      }
      monday.setUTCDate(monday.getUTCDate() + 1)
      return day
    }))
  }
  return weeks
}

export function employeeAcronyms(employees: Array<{ guid: string; name: string }>) {
  const result = new Map<string, string>()
  const used = new Set<string>()
  for (const { guid, name } of [...employees].sort((a, b) => a.guid.localeCompare(b.guid))) {
    const words = name.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? []
    const base = (words.length > 1
      ? words.slice(0, 2).map(word => [...word][0]).join('')
      : [...(words[0] ?? '')].slice(0, 2).join('')).toLocaleUpperCase('fr') || 'C'
    let acronym = base
    for (let n = 2; used.has(acronym); n++) acronym = `${base}${n}`
    used.add(acronym)
    result.set(guid, acronym)
  }
  return result
}
