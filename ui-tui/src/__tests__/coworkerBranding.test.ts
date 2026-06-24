import { describe, expect, it } from 'vitest'

import { coworkerNameFromHome, profileLabelFromHome } from '../lib/coworkerBranding.js'

describe('new media coworker branding', () => {
  it('uses the SOUL title as the coworker name', () => {
    const readText = (path: string) => path.endsWith('/SOUL.md') ? '# 短视频编导\n\n你是短视频编导。' : ''

    expect(coworkerNameFromHome('/home/me/.hermes/profiles/nm-script-writer', readText)).toBe('短视频编导')
  })

  it('falls back to a readable profile label', () => {
    expect(profileLabelFromHome('/home/me/.hermes/profiles/nm-script-writer')).toBe('script writer')
  })
})
