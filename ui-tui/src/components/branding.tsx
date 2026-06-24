import { Box, Text, useStdout } from '@hermes/ink'
import { useEffect, useState } from 'react'
import unicodeSpinners from 'unicode-animations'

import { coworkerNameFromHome, profileLabelFromHome } from '../lib/coworkerBranding.js'
import { flat } from '../lib/text.js'
import type { Theme } from '../theme.js'
import type { PanelSection, SessionInfo } from '../types.js'

const LOADER_TICK_MS = 120

function InlineLoader({ label, t }: { label: string; t: Theme }) {
  const [tick, setTick] = useState(0)
  const spinner = unicodeSpinners.braille
  const frame = spinner.frames[tick % spinner.frames.length] ?? '⠋'

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), Math.max(LOADER_TICK_MS, spinner.interval))

    return () => clearInterval(id)
  }, [spinner.interval])

  return (
    <Text color={t.color.muted} wrap="truncate">
      <Text color={t.color.accent}>{frame}</Text> {label}
    </Text>
  )
}

export function ArtLines({ lines }: { lines: [string, string][] }) {
  return (
    <>
      {lines.map(([c, text], i) => (
        <Text color={c} key={i}>
          {text}
        </Text>
      ))}
    </>
  )
}

export function Banner({ t }: { t: Theme }) {
  const profileName = profileLabelFromHome(process.env.HERMES_HOME)
  const coworkerName = coworkerNameFromHome(process.env.HERMES_HOME)

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color={t.color.primary}>
          {coworkerName === 'default' ? 'Hermes 工作台' : coworkerName}
        </Text>
        <Text color={t.color.muted}>profile · {profileName}</Text>
      </Box>
      <Text color={t.color.muted}>新媒体团队 AI 同事 · 输入任务即可开始协作</Text>
    </Box>
  )
}

// ── Collapsible helpers ──────────────────────────────────────────────

function CollapseToggle({
  count,
  open,
  suffix,
  t,
  title,
  onToggle
}: {
  count?: number
  open: boolean
  suffix?: string
  t: Theme
  title: string
  onToggle: () => void
}) {
  return (
    <Box onClick={onToggle}>
      <Text color={t.color.accent}>{open ? '▾ ' : '▸ '}</Text>
      <Text bold color={t.color.accent}>
        {title}
      </Text>
      {typeof count === 'number' ? (
        <Text color={t.color.muted}> ({count})</Text>
      ) : null}
      {suffix ? (
        <Text color={t.color.muted}> {suffix}</Text>
      ) : null}
    </Box>
  )
}

// ── SessionPanel ─────────────────────────────────────────────────────

const SKILLS_MAX = 8
const TOOLSETS_MAX = 8

export function SessionPanel({ info, sid, t }: SessionPanelProps) {
  const cols = useStdout().stdout?.columns ?? 100
  const profileName = profileLabelFromHome(process.env.HERMES_HOME)
  const coworkerName = coworkerNameFromHome(process.env.HERMES_HOME)
  const wide = cols >= 86
  const w = Math.max(20, cols - 8)
  const lineBudget = Math.max(12, w - 2)
  const strip = (s: string) => (s.endsWith('_tools') ? s.slice(0, -6) : s)

  // ── Local collapse state for each section ──
  const [toolsOpen, setToolsOpen] = useState(true)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [systemOpen, setSystemOpen] = useState(false)
  const [mcpOpen, setMcpOpen] = useState(false)

  const truncLine = (pfx: string, items: string[]) => {
    let line = ''
    let shown = 0

    for (const item of [...items].sort()) {
      const next = line ? `${line}, ${item}` : item

      if (pfx.length + next.length > lineBudget) {
        return line ? `${line}, …+${items.length - shown}` : `${item}, …`
      }

      line = next
      shown++
    }

    return line
  }

  // ── Collapsible skills section ──
  const skillEntries = Object.entries(info.skills).sort()
  const skillsTotal = flat(info.skills).length
  const skillsCatCount = skillEntries.length

  const skillsBody = () => {
    if (info.lazy && skillEntries.length === 0) {
      return <InlineLoader label="scanning skills" t={t} />
    }

    const shown = skillEntries.slice(0, SKILLS_MAX)
    const overflow = skillEntries.length - SKILLS_MAX

    return (
      <>
        {shown.map(([k, vs]) => (
          <Text key={k} wrap="truncate">
            <Text color={t.color.muted}>{strip(k)}: </Text>
            <Text color={t.color.text}>{truncLine(strip(k) + ': ', vs)}</Text>
          </Text>
        ))}
        {overflow > 0 && (
          <Text color={t.color.muted}>(and {overflow} more categories…)</Text>
        )}
      </>
    )
  }

  // ── Collapsible tools section ──
  const toolEntries = Object.entries(info.tools).sort()
  const toolsTotal = flat(info.tools).length
  const primaryTools = Object.entries(info.tools)
    .sort()
    .flatMap(([k, vs]) => vs.slice(0, 3).map(v => `${strip(k)}:${v}`))
    .slice(0, wide ? 8 : 5)
  const starterPrompts = [
    '生成本周选题和发布节奏',
    '把素材改成短视频脚本',
    '检查发布前风险和清单'
  ]

  const toolsBody = () => {
    const shown = toolEntries.slice(0, TOOLSETS_MAX)
    const overflow = toolEntries.length - TOOLSETS_MAX

    return (
      <>
        {shown.map(([k, vs]) => (
          <Text key={k} wrap="truncate">
            <Text color={t.color.muted}>{strip(k)}: </Text>
            <Text color={t.color.text}>{truncLine(strip(k) + ': ', vs)}</Text>
          </Text>
        ))}
        {overflow > 0 && (
          <Text color={t.color.muted}>(and {overflow} more toolsets…)</Text>
        )}
      </>
    )
  }

  // ── Collapsible MCP section ──
  const mcpBody = () => (
    <>
      {(info.mcp_servers ?? []).map(s => (
        <Text key={s.name} wrap="truncate">
          <Text color={t.color.muted}>{`  ${s.name} `}</Text>
          <Text color={t.color.muted}>{`[${s.transport}]`}</Text>
          <Text color={t.color.muted}>: </Text>
          {s.connected ? (
            <Text color={t.color.text}>
              {s.tools} tool{s.tools === 1 ? '' : 's'}
            </Text>
          ) : (
            <Text color={t.color.error}>failed</Text>
          )}
        </Text>
      ))}
    </>
  )

  // ── System prompt body ──
  const sysPromptLen = (info.system_prompt ?? '').length

  const systemBody = () => {
    if (sysPromptLen === 0) {
      return <Text color={t.color.muted}>No system prompt loaded.</Text>
    }

    return (
      <Text color={t.color.muted}>
        {info.system_prompt}
      </Text>
    )
  }

  return (
    <Box borderColor={t.color.border} borderStyle="round" flexDirection="column" marginBottom={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column" width={w}>
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color={t.color.primary}>
            {coworkerName === 'default' ? '欢迎使用 Hermes' : `你好，我是「${coworkerName}」`}
          </Text>
          <Text color={t.color.muted} wrap="truncate-end">
            {info.model.split('/').pop()} · {profileName}
          </Text>
        </Box>

        <Box flexDirection={wide ? 'row' : 'column'}>
          <Box borderColor={t.color.border} borderStyle="round" flexDirection="column" marginRight={wide ? 1 : 0} paddingX={1} width={wide ? Math.floor(w * 0.34) : w}>
            <Text bold color={t.color.label}>可用工具</Text>
            {primaryTools.length > 0 ? primaryTools.map(tool => (
              <Text color={t.color.muted} key={tool} wrap="truncate">
                - {tool}
              </Text>
            )) : <InlineLoader label="scanning tools" t={t} />}
            {toolsTotal > primaryTools.length ? (
              <Text color={t.color.muted}>+ {toolsTotal - primaryTools.length} more</Text>
            ) : null}
          </Box>

          <Box borderColor={t.color.border} borderStyle="round" flexDirection="column" marginRight={wide ? 1 : 0} marginTop={wide ? 0 : 1} paddingX={1} width={wide ? Math.floor(w * 0.34) : w}>
            <Text bold color={t.color.label}>推荐任务</Text>
            {starterPrompts.map(prompt => (
              <Text color={t.color.text} key={prompt} wrap="truncate">
                - {prompt}
              </Text>
            ))}
          </Box>

          <Box borderColor={t.color.border} borderStyle="round" flexDirection="column" marginTop={wide ? 0 : 1} paddingX={1} width={wide ? Math.max(20, w - Math.floor(w * 0.68) - 4) : w}>
            <Text bold color={t.color.label}>最近会话</Text>
            {sid ? (
              <Text color={t.color.text} wrap="truncate">
                当前 · {sid}
              </Text>
            ) : (
              <Text color={t.color.muted}>暂无会话</Text>
            )}
            <Text color={t.color.muted} wrap="truncate">
              /sessions 查看历史
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <CollapseToggle
            onToggle={() => setToolsOpen(v => !v)}
            open={toolsOpen}
            t={t}
            title="工具详情"
          />
          {toolsOpen && toolsBody()}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <CollapseToggle
            count={skillsTotal}
            onToggle={() => setSkillsOpen(v => !v)}
            open={skillsOpen}
            suffix={skillsCatCount > 0 ? `in ${skillsCatCount} categor${skillsCatCount === 1 ? 'y' : 'ies'}` : undefined}
            t={t}
            title="技能"
          />
          {skillsOpen && skillsBody()}
        </Box>

        {sysPromptLen > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <CollapseToggle
              onToggle={() => setSystemOpen(v => !v)}
              open={systemOpen}
              suffix={`— ${sysPromptLen.toLocaleString()} chars`}
              t={t}
              title="系统提示词"
            />
            {systemOpen && systemBody()}
          </Box>
        )}

        {info.mcp_servers && info.mcp_servers.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <CollapseToggle
              count={info.mcp_servers.length}
              onToggle={() => setMcpOpen(v => !v)}
              open={mcpOpen}
              suffix="connected"
              t={t}
              title="MCP 服务"
            />
            {mcpOpen && mcpBody()}
          </Box>
        )}

        <Text color={t.color.muted}>
          {toolsTotal} tools{' · '}
          {skillsTotal} skills
          {info.mcp_servers?.length ? ` · ${info.mcp_servers.length} MCP` : ''}
          {' · '}
          /help 查看命令
        </Text>

        {typeof info.update_behind === 'number' && info.update_behind > 0 && (
          <Text bold color={t.color.warn}>
            ! {info.update_behind} {info.update_behind === 1 ? 'commit' : 'commits'} behind
            <Text bold={false} color={t.color.warn} dimColor>
              {' '}
              - run{' '}
            </Text>
            <Text bold color={t.color.warn}>
              {info.update_command || 'hermes update'}
            </Text>
            <Text bold={false} color={t.color.warn} dimColor>
              {' '}
              to update
            </Text>
          </Text>
        )}
      </Box>
    </Box>
  )
}

export function Panel({ sections, t, title }: PanelProps) {
  return (
    <Box borderColor={t.color.border} borderStyle="round" flexDirection="column" paddingX={2} paddingY={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={t.color.primary}>
          {title}
        </Text>
      </Box>

      {sections.map((sec, si) => (
        <Box flexDirection="column" key={si} marginTop={si > 0 ? 1 : 0}>
          {sec.title && (
            <Text bold color={t.color.accent}>
              {sec.title}
            </Text>
          )}

          {sec.rows?.map(([k, v], ri) => (
            <Text key={ri} wrap="truncate">
              <Text color={t.color.muted}>{k.padEnd(20)}</Text>
              <Text color={t.color.text}>{v}</Text>
            </Text>
          ))}

          {sec.items?.map((item, ii) => (
            <Text color={t.color.text} key={ii} wrap="truncate">
              {item}
            </Text>
          ))}

          {sec.text && <Text color={t.color.muted}>{sec.text}</Text>}
        </Box>
      ))}
    </Box>
  )
}

interface PanelProps {
  sections: PanelSection[]
  t: Theme
  title: string
}

interface SessionPanelProps {
  info: SessionInfo
  sid?: string | null
  t: Theme
}
