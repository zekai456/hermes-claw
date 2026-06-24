import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

type ReadText = (path: string) => string

const readFileText: ReadText = path => readFileSync(path, 'utf8')

export function profileLabelFromHome(home: string | undefined): string {
  const leaf = basename(String(home || '').replace(/[\\/]+$/, ''))

  if (!leaf || leaf === '.hermes') {
    return 'default'
  }

  return leaf
    .replace(/^nm-custom-/, 'custom ')
    .replace(/^nm-/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || leaf
}

export function coworkerNameFromHome(home: string | undefined, readText: ReadText = readFileText): string {
  const fallback = profileLabelFromHome(home)

  if (!home) {
    return fallback
  }

  try {
    const soul = readText(join(home, 'SOUL.md'))
    const title = soul
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line.startsWith('# '))
      ?.replace(/^#\s+/, '')
      .trim()

    return title || fallback
  } catch {
    return fallback
  }
}
