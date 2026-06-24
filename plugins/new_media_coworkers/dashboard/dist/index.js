(function () {
  const sdk = window.__HERMES_PLUGIN_SDK__;
  const registry = window.__HERMES_PLUGINS__;
  if (!sdk || !registry) {
    console.error("[new-media-coworkers] Hermes plugin SDK unavailable");
    return;
  }

  const React = sdk.React;
  const { useCallback, useEffect, useMemo, useState } = sdk.hooks;
  const { fetchJSON } = sdk;
  const { Badge, Button } = sdk.components;

  const TOOLSETS = ["web", "browser", "file", "image_gen", "cronjob", "skills", "memory"];
  const ROLE_ICONS = {
    "social-media-manager": "calendar",
    "content-repurposer": "shuffle",
    "trend-researcher": "search",
    "script-writer": "pen",
    "competitor-watcher": "radar",
    "growth-analyst": "spark",
    "brand-editor": "pen",
    "visual-director": "spark",
    "ppt-producer": "copy",
    "crawler-researcher": "search",
  };

  function Icon({ name, className }) {
    const common = {
      className: className || "nmc-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
    };
    const paths = {
      plus: [
        ["path", { d: "M12 5v14" }],
        ["path", { d: "M5 12h14" }],
      ],
      edit: [
        ["path", { d: "M12 20h9" }],
        ["path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" }],
      ],
      play: [
        ["path", { d: "M8 5v14l11-7Z" }],
      ],
      copy: [
        ["rect", { x: "8", y: "8", width: "11", height: "11", rx: "2" }],
        ["path", { d: "M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" }],
      ],
      refresh: [
        ["path", { d: "M20 11a8 8 0 0 0-14.5-4.5L4 8" }],
        ["path", { d: "M4 4v4h4" }],
        ["path", { d: "M4 13a8 8 0 0 0 14.5 4.5L20 16" }],
        ["path", { d: "M20 20v-4h-4" }],
      ],
      calendar: [
        ["rect", { x: "4", y: "5", width: "16", height: "15", rx: "3" }],
        ["path", { d: "M8 3v4" }],
        ["path", { d: "M16 3v4" }],
        ["path", { d: "M4 10h16" }],
      ],
      shuffle: [
        ["path", { d: "M16 3h5v5" }],
        ["path", { d: "M4 20 21 3" }],
        ["path", { d: "M21 16v5h-5" }],
        ["path", { d: "M15 15l6 6" }],
        ["path", { d: "M4 4l5 5" }],
      ],
      search: [
        ["circle", { cx: "11", cy: "11", r: "7" }],
        ["path", { d: "m20 20-4-4" }],
      ],
      pen: [
        ["path", { d: "M15 4l5 5L9 20l-5 1 1-5Z" }],
        ["path", { d: "M13 6l5 5" }],
      ],
      radar: [
        ["path", { d: "M12 12 19 5" }],
        ["circle", { cx: "12", cy: "12", r: "2" }],
        ["path", { d: "M20 12a8 8 0 1 1-2.35-5.65" }],
        ["path", { d: "M16 12a4 4 0 1 1-1.17-2.83" }],
      ],
      spark: [
        ["path", { d: "M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8Z" }],
        ["path", { d: "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" }],
      ],
      close: [
        ["path", { d: "M18 6 6 18" }],
        ["path", { d: "m6 6 12 12" }],
      ],
      save: [
        ["path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" }],
        ["path", { d: "M17 21v-8H7v8" }],
        ["path", { d: "M7 3v5h8" }],
      ],
    }[name] || [];
    return React.createElement(
      "svg",
      common,
      paths.map(([tag, attrs], index) => React.createElement(tag, { key: index, ...attrs })),
    );
  }

  function ButtonContent({ icon, children }) {
    return React.createElement(
      "span",
      { className: "nmc-button-content" },
      React.createElement(Icon, { name: icon, className: "nmc-button-icon" }),
      React.createElement("span", null, children),
    );
  }

  function toolLabel(name) {
    const labels = {
      web: "Web",
      browser: "浏览器",
      file: "文件",
      image_gen: "图片",
      cronjob: "定时任务",
      skills: "Skills",
      memory: "记忆",
    };
    return labels[name] || name;
  }

  function statusById(rows) {
    const map = new Map();
    for (const row of rows || []) {
      map.set(row.id, row);
    }
    return map;
  }

  function linesToList(value) {
    return String(value || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function listToLines(value) {
    return (value || []).join("\n");
  }

  function emptyDraft() {
    return {
      id: "",
      name: "",
      role: "",
      description: "",
      soul_focus: "",
      strengthsText: "",
      starterPromptsText: "",
      default_toolsets: ["web", "browser", "file", "skills", "memory"],
      default_skills: [],
    };
  }

  function draftFromPreset(preset) {
    return {
      id: preset.id || "",
      name: preset.name || "",
      role: preset.role || "",
      description: preset.description || "",
      soul_focus: preset.soul_focus || "",
      strengthsText: listToLines(preset.strengths),
      starterPromptsText: listToLines(preset.starter_prompts),
      default_toolsets: preset.default_toolsets || ["web", "browser", "file", "skills", "memory"],
      default_skills: preset.default_skills || [],
    };
  }

  function CoworkerEditor({ draft, setDraft, onCancel, onSave, saving, error }) {
    const toggleTool = (tool) => {
      setDraft((prev) => {
        const selected = new Set(prev.default_toolsets || []);
        if (selected.has(tool)) {
          selected.delete(tool);
        } else {
          selected.add(tool);
        }
        return { ...prev, default_toolsets: Array.from(selected) };
      });
    };

    const update = (key) => (event) => {
      setDraft((prev) => ({ ...prev, [key]: event.target.value }));
    };

    return React.createElement(
      "section",
      { className: "nmc-editor" },
      React.createElement(
        "div",
        { className: "nmc-editor-head" },
        React.createElement(
          "div",
          null,
          React.createElement("p", { className: "nmc-eyebrow" }, draft.id ? "编辑 AI 同事" : "新建 AI 同事"),
          React.createElement("h3", null, draft.id ? draft.name || "未命名同事" : "创建自定义同事"),
        ),
        React.createElement(
          Button,
          { variant: "ghost", onClick: onCancel },
          React.createElement(ButtonContent, { icon: "close" }, "关闭"),
        ),
      ),
      React.createElement(
        "div",
        { className: "nmc-form-grid" },
        React.createElement(
          "label",
          null,
          React.createElement("span", null, "同事名称"),
          React.createElement("input", {
            value: draft.name,
            onChange: update("name"),
            placeholder: "例如：公众号主编",
          }),
        ),
        React.createElement(
          "label",
          null,
          React.createElement("span", null, "岗位定位"),
          React.createElement("input", {
            value: draft.role,
            onChange: update("role"),
            placeholder: "例如：公众号选题、结构和终稿负责人",
          }),
        ),
        React.createElement(
          "label",
          { className: "nmc-span-2" },
          React.createElement("span", null, "一句话说明"),
          React.createElement("textarea", {
            value: draft.description,
            onChange: update("description"),
            rows: 2,
            placeholder: "这个同事主要解决什么问题？",
          }),
        ),
        React.createElement(
          "label",
          null,
          React.createElement("span", null, "擅长工作，每行一个"),
          React.createElement("textarea", {
            value: draft.strengthsText,
            onChange: update("strengthsText"),
            rows: 5,
            placeholder: "选题判断\n文章结构\n标题优化",
          }),
        ),
        React.createElement(
          "label",
          null,
          React.createElement("span", null, "可直接开始的任务，每行一个"),
          React.createElement("textarea", {
            value: draft.starterPromptsText,
            onChange: update("starterPromptsText"),
            rows: 5,
            placeholder: "帮我把这个选题扩成公众号大纲。",
          }),
        ),
        React.createElement(
          "label",
          { className: "nmc-span-2" },
          React.createElement("span", null, "SOUL 核心使命"),
          React.createElement("textarea", {
            value: draft.soul_focus,
            onChange: update("soul_focus"),
            rows: 3,
            placeholder: "描述这个 AI 同事的岗位边界、默认工作方式和输出目标。",
          }),
        ),
      ),
      React.createElement(
        "div",
        { className: "nmc-tool-editor" },
        React.createElement("p", null, "默认工具集"),
        React.createElement(
          "div",
          { className: "nmc-tool-options" },
          TOOLSETS.map((tool) =>
            React.createElement(
              "label",
              { key: tool, className: "nmc-check" },
              React.createElement("input", {
                type: "checkbox",
                checked: (draft.default_toolsets || []).includes(tool),
                onChange: () => toggleTool(tool),
              }),
              React.createElement("span", null, toolLabel(tool)),
            ),
          ),
        ),
      ),
      error ? React.createElement("p", { className: "nmc-error" }, error) : null,
      React.createElement(
        "div",
        { className: "nmc-actions" },
        React.createElement(
          Button,
          { onClick: onSave, disabled: saving },
          React.createElement(ButtonContent, { icon: "save" }, saving ? "保存中..." : "保存并刷新 Profile"),
        ),
        React.createElement(Button, { variant: "outline", onClick: onCancel, disabled: saving }, "取消"),
      ),
    );
  }

  function CoworkerCard({ preset, status, onCreate, onEdit, busyId, error }) {
    const created = Boolean(status && status.created);
    const busy = busyId === preset.id;
    const launchCommand = (status && status.launch_command) || `hermes --profile ${preset.profile_name} chat`;
    const chatUrl = (status && status.chat_url) || `/webchat?profile=${preset.profile_name}`;
    const custom = preset.source === "custom";

    const copyCommand = async () => {
      try {
        await navigator.clipboard.writeText(launchCommand);
      } catch (err) {
        console.warn("[new-media-coworkers] clipboard failed", err);
      }
    };

    return React.createElement(
      "article",
      { className: "nmc-card" },
      React.createElement(
        "div",
        { className: "nmc-card-head" },
        React.createElement(
          "div",
          { className: "nmc-card-title" },
          React.createElement(
            "div",
            { className: "nmc-avatar" },
            React.createElement(Icon, { name: ROLE_ICONS[preset.id] || "spark" }),
          ),
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "nmc-role" }, preset.role),
            React.createElement("h3", null, preset.name),
          ),
        ),
        React.createElement(
          "span",
          { className: created ? "nmc-status nmc-status-ready" : "nmc-status" },
          custom ? "自定义" : created ? "已创建" : "预设",
        ),
      ),
      React.createElement("p", { className: "nmc-description" }, preset.description),
      React.createElement(
        "div",
        { className: "nmc-list" },
        (preset.strengths || []).map((item) =>
          React.createElement("span", { key: item, className: "nmc-chip" }, item),
        ),
      ),
      React.createElement(
        "div",
        { className: "nmc-tools" },
        (preset.default_toolsets || []).map((tool) =>
          React.createElement(Badge, { key: tool, variant: "secondary" }, toolLabel(tool)),
        ),
      ),
      React.createElement(
        "div",
        { className: "nmc-prompts" },
        React.createElement("p", null, "可直接开始的任务"),
        React.createElement(
          "ul",
          null,
          (preset.starter_prompts || []).map((prompt) =>
            React.createElement("li", { key: prompt }, prompt),
          ),
        ),
      ),
      error ? React.createElement("p", { className: "nmc-error" }, error) : null,
      React.createElement(
        "div",
        { className: "nmc-actions" },
        React.createElement(
          Button,
          {
            onClick: () => onCreate(preset.id),
            disabled: busy,
          },
          React.createElement(ButtonContent, { icon: created ? "refresh" : "plus" }, created ? "刷新同事" : busy ? "创建中..." : "创建同事"),
        ),
        React.createElement(
          Button,
          {
            variant: "outline",
            onClick: () => {
              window.location.href = chatUrl;
            },
            disabled: !created,
          },
          React.createElement(ButtonContent, { icon: "play" }, "开始对话"),
        ),
        React.createElement(
          Button,
          {
            variant: "outline",
            onClick: () => onEdit(preset),
          },
          React.createElement(ButtonContent, { icon: "edit" }, custom ? "编辑" : "复制编辑"),
        ),
        React.createElement(
          Button,
          {
            variant: "ghost",
            onClick: copyCommand,
            disabled: !created,
          },
          React.createElement(ButtonContent, { icon: "copy" }, "复制命令"),
        ),
      ),
      created
        ? React.createElement("code", { className: "nmc-command" }, launchCommand)
        : null,
    );
  }

  function CoworkersPage() {
    const [presets, setPresets] = useState([]);
    const [statuses, setStatuses] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [errors, setErrors] = useState({});
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        const [presetRes, statusRes] = await Promise.all([
          fetchJSON("/api/plugins/new-media-coworkers/presets"),
          fetchJSON("/api/plugins/new-media-coworkers/status"),
        ]);
        setPresets(presetRes.presets || []);
        setStatuses(statusById(statusRes.coworkers || []));
        setErrors({});
      } catch (err) {
        setErrors({ page: String(err && err.message ? err.message : err) });
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      load();
    }, [load]);

    const create = useCallback(
      async (presetId) => {
        setBusyId(presetId);
        setErrors((prev) => ({ ...prev, [presetId]: "" }));
        try {
          await fetchJSON("/api/plugins/new-media-coworkers/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preset_id: presetId }),
          });
          await load();
        } catch (err) {
          setErrors((prev) => ({
            ...prev,
            [presetId]: String(err && err.message ? err.message : err),
          }));
        } finally {
          setBusyId("");
        }
      },
      [load],
    );

    const edit = useCallback((preset) => {
      setErrors((prev) => ({ ...prev, editor: "" }));
      setDraft(draftFromPreset(preset));
    }, []);

    const saveDraft = useCallback(async () => {
      if (!draft) return;
      setSaving(true);
      setErrors((prev) => ({ ...prev, editor: "" }));
      try {
        await fetchJSON("/api/plugins/new-media-coworkers/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draft.id || undefined,
            name: draft.name,
            role: draft.role,
            description: draft.description,
            soul_focus: draft.soul_focus,
            strengths: linesToList(draft.strengthsText),
            starter_prompts: linesToList(draft.starterPromptsText),
            default_toolsets: draft.default_toolsets,
            default_skills: [],
          }),
        });
        setDraft(null);
        await load();
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          editor: String(err && err.message ? err.message : err),
        }));
      } finally {
        setSaving(false);
      }
    }, [draft, load]);

    const sortedPresets = useMemo(() => presets, [presets]);
    const createdCount = useMemo(
      () => presets.filter((preset) => Boolean(statuses.get(preset.id)?.created)).length,
      [presets, statuses],
    );
    const customCount = useMemo(
      () => presets.filter((preset) => preset.source === "custom").length,
      [presets],
    );

    if (loading) {
      return React.createElement(
        "div",
        { className: "nmc-page" },
        React.createElement("p", { className: "nmc-muted" }, "正在加载 AI 同事..."),
      );
    }

    return React.createElement(
      "div",
      { className: "nmc-page" },
      React.createElement(
        "section",
        { className: "nmc-header" },
        React.createElement(
          "div",
          { className: "nmc-header-row" },
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "nmc-eyebrow" }, "新媒体团队"),
            React.createElement("h2", null, "AI 同事库"),
            React.createElement(
              "p",
              null,
              "为常见新媒体岗位创建独立 Hermes profile。每个 AI 同事都有自己的 SOUL、人设、技能、工具集、记忆和会话历史。",
            ),
            React.createElement(
              "div",
              { className: "nmc-stats" },
              React.createElement("span", null, `${presets.length} 位同事`),
              React.createElement("span", null, `${createdCount} 个已创建 profile`),
              React.createElement("span", null, `${customCount} 个自定义`),
            ),
          ),
          React.createElement(
            Button,
            { onClick: () => setDraft(emptyDraft()) },
            React.createElement(ButtonContent, { icon: "plus" }, "新建 AI 同事"),
          ),
        ),
      ),
      draft
        ? React.createElement(CoworkerEditor, {
            draft,
            setDraft,
            onCancel: () => setDraft(null),
            onSave: saveDraft,
            saving,
            error: errors.editor,
          })
        : null,
      errors.page ? React.createElement("p", { className: "nmc-error" }, errors.page) : null,
      React.createElement(
        "div",
        { className: "nmc-grid" },
        sortedPresets.map((preset) =>
          React.createElement(CoworkerCard, {
            key: preset.id,
            preset,
            status: statuses.get(preset.id),
            onCreate: create,
            onEdit: edit,
            busyId,
            error: errors[preset.id],
          }),
        ),
      ),
    );
  }

  registry.register("new-media-coworkers", CoworkersPage);
})();
