import { Button } from "@nous-research/ui/ui/components/button";
import {
  ArrowUp,
  Bot,
  Clock3,
  FileText,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Markdown } from "@/components/Markdown";
import {
  api,
  type CoworkerStatus,
  type DocumentDetail,
  type DocumentInfo,
} from "@/lib/api";
import { GatewayClient, type GatewayEvent } from "@/lib/gatewayClient";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "system" | "user";
  status?: "complete" | "streaming";
  text: string;
};

type ToolEvent = {
  id: string;
  label: string;
  status: "complete" | "running";
};

type ResumeMessage = {
  role: "assistant" | "system" | "tool" | "user";
  text?: string;
  content?: unknown;
};

const starterPrompts = [
  "帮我生成本周新媒体选题和发布节奏。",
  "把这段素材改成短视频脚本和标题钩子。",
  "检查这篇内容的发布风险和优化建议。",
];

function displayProfileName(profile: string | null) {
  if (!profile) return "新媒体 AI 同事";
  return profile
    .replace(/^nm-custom-/, "自定义同事 ")
    .replace(/^nm-/, "")
    .replace(/[-_]+/g, " ");
}

function eventText(ev: GatewayEvent): string {
  const payload = (ev.payload ?? {}) as Record<string, unknown>;
  return typeof payload.text === "string" ? payload.text : "";
}

function stripInjectedContext(text: string) {
  return text
    .replace(/\n*请以以下 AI 同事设定执行本轮任务。[\s\S]*?<AI同事设定>[\s\S]*?<\/AI同事设定>/g, "")
    .replace(/\n*请参考以下团队文档回答。[\s\S]*?<团队文档>[\s\S]*?<\/团队文档>/g, "")
    .trim();
}

function messageText(message: ResumeMessage) {
  const value = message.text ?? message.content ?? "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value || "");
}

function extractCoworkerFromHistory(messages: ResumeMessage[], coworkers: CoworkerStatus[]) {
  for (const message of messages) {
    const text = messageText(message);
    const match = text.match(/<AI同事设定>([\s\S]*?)<\/AI同事设定>/);
    const soul = match?.[1] ?? "";
    if (!soul) continue;
    const found = coworkers.find((coworker) =>
      soul.includes(`# ${coworker.name}`) || soul.includes(`「${coworker.name}」`),
    );
    if (found) return found.profile_name;
  }
  return "";
}

function historyToChatMessages(messages: ResumeMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.role === "assistant" || message.role === "user")
    .map((message, index) => ({
      id: `history-${index}`,
      role: message.role as "assistant" | "user",
      status: "complete" as const,
      text: message.role === "user"
        ? stripInjectedContext(messageText(message))
        : messageText(message),
    }))
    .filter((message) => message.text.trim());
}

export default function WebChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const profile = searchParams.get("profile");
  const resume = searchParams.get("resume");
  const [currentProfile, setCurrentProfile] = useState(profile ?? "");
  const [coworkers, setCoworkers] = useState<CoworkerStatus[]>([]);
  const coworkersRef = useRef<CoworkerStatus[]>([]);
  const activeCoworker = useMemo(
    () => coworkers.find((item) => item.profile_name === currentProfile),
    [coworkers, currentProfile],
  );
  const profileName = activeCoworker?.name ?? displayProfileName(currentProfile || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resumeMessages, setResumeMessages] = useState<ResumeMessage[]>([]);
  const [tools, setTools] = useState<ToolEvent[]>([]);
  const [input, setInput] = useState("");
  const [connection, setConnection] = useState<"connecting" | "error" | "open">("connecting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<DocumentDetail[]>([]);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [coworkerSoul, setCoworkerSoul] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const gwRef = useRef<GatewayClient | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentProfile(profile ?? "");
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, tools]);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    api.getCoworkerStatus()
      .then((res) => setCoworkers(res.coworkers ?? []))
      .catch(() => setCoworkers([]));
  }, []);

  useEffect(() => {
    coworkersRef.current = coworkers;
  }, [coworkers]);

  useEffect(() => {
    if (profile || !resumeMessages.length || !coworkers.length) return;
    const inferredProfile = extractCoworkerFromHistory(resumeMessages, coworkers);
    if (inferredProfile) setCurrentProfile(inferredProfile);
  }, [coworkers, profile, resumeMessages]);

  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    api.getSessionMessages(resume)
      .then((res) => {
        if (cancelled) return;
        const restored = res.messages.map((message) => ({
          role: message.role,
          content: message.content,
        }));
        setResumeMessages(restored);
        setMessages(historyToChatMessages(restored));
        if (!profile && res.profile_name) {
          setCurrentProfile(res.profile_name);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "历史会话加载失败。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, resume]);

  useEffect(() => {
    if (!currentProfile) {
      setCoworkerSoul("");
      return;
    }
    api.getProfileSoul(currentProfile)
      .then((res) => setCoworkerSoul(res.content || ""))
      .catch(() => setCoworkerSoul(""));
  }, [currentProfile]);

  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) =>
      `${doc.name} ${doc.filename} ${doc.preview}`.toLowerCase().includes(q),
    );
  }, [docSearch, documents]);

  const visibleStarterPrompts = useMemo(
    () => activeCoworker?.starter_prompts?.length
      ? activeCoworker.starter_prompts.slice(0, 3)
      : starterPrompts,
    [activeCoworker],
  );

  const selectCoworker = useCallback(async (profileName: string) => {
    const coworker = coworkers.find((item) => item.profile_name === profileName);
    if (coworker && !coworker.created) {
      try {
        await api.createCoworkerProfile(coworker.id);
        const res = await api.getCoworkerStatus();
        setCoworkers(res.coworkers ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI 同事创建失败。");
        return;
      }
    }
    setMessages([]);
    setSelectedDocs([]);
    navigate(profileName ? `/webchat?profile=${encodeURIComponent(profileName)}` : "/webchat");
    const gw = gwRef.current;
    if (gw?.state === "open") {
      gw.request<{ session_id: string }>("session.create", { cols: 96 })
        .then((res) => setSessionId(res.session_id))
        .catch(() => {});
    }
  }, [coworkers, navigate]);

  const uploadFiles = useCallback(async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0) return;
    setError(null);
    try {
      const uploaded: DocumentDetail[] = [];
      for (const file of selected) {
        const doc = await api.uploadDocument(file);
        uploaded.push(await api.getDocument(doc.id));
      }
      setSelectedDocs((prev) => [...prev, ...uploaded]);
      await loadDocuments();
      setDocPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "附件上传失败。");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [loadDocuments]);

  const attachDocument = useCallback(async (doc: DocumentInfo) => {
    if (selectedDocs.some((item) => item.id === doc.id)) {
      setDocPickerOpen(false);
      return;
    }
    try {
      const detail = await api.getDocument(doc.id);
      setSelectedDocs((prev) => [...prev, detail]);
      setDocPickerOpen(false);
      setDocSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "文档读取失败。");
    }
  }, [selectedDocs]);

  const buildPrompt = useCallback((text: string) => {
    const parts = [text];
    if (coworkerSoul.trim()) {
      parts.push(
        "",
        "请以以下 AI 同事设定执行本轮任务。",
        "",
        "<AI同事设定>",
        coworkerSoul.trim(),
        "</AI同事设定>",
      );
    }
    if (selectedDocs.length > 0) {
      const docsBlock = selectedDocs
        .map((doc) => {
          const content = doc.content.length > 8000
            ? `${doc.content.slice(0, 8000)}\n\n[文档过长，以上为前 8000 字符摘要]`
            : doc.content;
          return `## ${doc.name}\n文件：${doc.filename}\n\n${content}`;
        })
        .join("\n\n---\n\n");
      parts.push(
        "",
        "请参考以下团队文档回答。不要伪造文档中没有的数据；如果资料不足，请直接说明。",
        "",
        "<团队文档>",
        docsBlock,
        "</团队文档>",
      );
    }
    return parts.join("\n");
  }, [coworkerSoul, selectedDocs]);

  const appendAssistant = useCallback((text = "", status: ChatMessage["status"] = "streaming") => {
    setMessages((prev) => {
      const last = prev.at(-1);
      if (last?.role === "assistant" && last.status === "streaming") {
        return prev.map((msg, index) =>
          index === prev.length - 1 ? { ...msg, status, text: msg.text + text } : msg,
        );
      }
      return [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          status,
          text,
        },
      ];
    });
  }, []);

  const newSession = useCallback(async () => {
    const gw = gwRef.current;
    if (!gw) return;
    setBusy(false);
    setError(null);
    setTools([]);
    setMessages([]);
    setResumeMessages([]);
    const res = await gw.request<{ session_id: string }>("session.create", { cols: 96 });
    setSessionId(res.session_id);
  }, []);

  useEffect(() => {
    let disposed = false;
    const gw = new GatewayClient();
    gwRef.current = gw;

    const unsubs = [
      gw.on("message.start", () => {
        if (disposed) return;
        setBusy(true);
        appendAssistant("", "streaming");
      }),
      gw.on("message.delta", (ev) => {
        if (disposed) return;
        appendAssistant(eventText(ev), "streaming");
      }),
      gw.on("message.complete", (ev) => {
        if (disposed) return;
        const text = eventText(ev);
        setBusy(false);
        setMessages((prev) => {
          const last = prev.at(-1);
          if (last?.role === "assistant" && last.status === "streaming") {
            return prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, status: "complete", text: text || msg.text } : msg,
            );
          }
          return [...prev, { id: `assistant-${Date.now()}`, role: "assistant", status: "complete", text }];
        });
      }),
      gw.on("tool.start", (ev) => {
        const payload = (ev.payload ?? {}) as Record<string, unknown>;
        const label = String(payload.name ?? payload.tool ?? "工具调用");
        setTools((prev) => [
          ...prev,
          { id: `${label}-${Date.now()}`, label, status: "running" },
        ]);
      }),
      gw.on("tool.complete", (ev) => {
        const payload = (ev.payload ?? {}) as Record<string, unknown>;
        const label = String(payload.name ?? payload.tool ?? "工具调用");
        setTools((prev) => {
          const next = [...prev];
          const index = next.findLastIndex((item) => item.label === label && item.status === "running");
          if (index >= 0) next[index] = { ...next[index], status: "complete" };
          return next;
        });
      }),
      gw.on("error", (ev) => {
        setBusy(false);
        setError(eventText(ev) || "WebChat 运行出错。");
      }),
    ];

    gw.connect()
      .then(async () => {
        if (disposed) return;
        setConnection("open");
        await new Promise((resolve) => window.setTimeout(resolve, 20));
        await (resume
          ? gw.request<{ session_id: string; messages?: ResumeMessage[] }>("session.resume", { session_id: resume, cols: 96 })
          : gw.request<{ session_id: string }>("session.create", { cols: 96 }))
          .then((res) => {
            if (disposed) return;
            setSessionId(res.session_id);
            if ("messages" in res && Array.isArray(res.messages)) {
              setResumeMessages(res.messages);
              setMessages(historyToChatMessages(res.messages));
              const inferredProfile = extractCoworkerFromHistory(res.messages, coworkersRef.current);
              if (inferredProfile && !profile) {
                setCurrentProfile(inferredProfile);
              }
            }
          });
      })
      .catch((err) => {
        if (disposed) return;
        setConnection("error");
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      disposed = true;
      unsubs.forEach((unsub) => unsub());
      gw.close();
      gwRef.current = null;
    };
  }, [appendAssistant, profile, resume]);

  const submit = useCallback(async () => {
    const text = input.trim();
    const gw = gwRef.current;
    if (!text || !gw || !sessionId || busy) return;

    setInput("");
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", status: "complete", text },
    ]);

    try {
      if (text.startsWith("/")) {
        setBusy(true);
        const res = await gw.request<{ output?: string; warning?: string }>(
          "slash.exec",
          { session_id: sessionId, command: text },
          120_000,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `slash-${Date.now()}`,
            role: "assistant",
            status: "complete",
            text: [res.output, res.warning].filter(Boolean).join("\n\n"),
          },
        ]);
        setBusy(false);
      } else {
        await gw.request("prompt.submit", { session_id: sessionId, text: buildPrompt(text) }, 30_000);
        setBusy(true);
        setSelectedDocs([]);
      }
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [buildPrompt, busy, input, sessionId]);

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#f8fafc] text-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-normal text-slate-950">
                {profileName}
              </h1>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                WebChat
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">
              {connection === "open" ? "已连接 Hermes gateway" : connection === "error" ? "连接失败" : "连接中..."}
              {sessionId ? ` · ${sessionId}` : ""}
            </p>
          </div>
          <select
            className="hidden h-9 max-w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 md:block"
            value={currentProfile}
            onChange={(event) => void selectCoworker(event.target.value)}
            title="选择 AI 同事"
          >
            <option value="">默认同事</option>
            {coworkers.map((coworker) => (
              <option key={coworker.id} value={coworker.profile_name}>
                {coworker.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button ghost size="icon" className="rounded-lg" onClick={newSession} title="新会话">
            <Plus className="h-5 w-5" />
          </Button>
          <Link to={`/chat${currentProfile ? `?profile=${encodeURIComponent(currentProfile)}` : ""}`} title="终端模式">
            <Button ghost size="icon" className="rounded-lg">
              <Terminal className="h-5 w-5" />
            </Button>
          </Link>
          <Button ghost size="icon" className="rounded-lg" title="设置">
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <section ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-cyan-100 text-cyan-700 shadow-sm">
                <Bot className="h-11 w-11" />
              </div>
              <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                今天要让哪位 AI 同事开工？
              </h2>
              <p className="mt-3 max-w-lg text-base leading-7 text-slate-600">
                可以直接输入任务，也可以用 @ 引用文档。AI 会结合工具、技能和当前 profile 的 SOUL 来协作。
              </p>
              <div className="mt-7 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
                {visibleStarterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm leading-6 text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                      message.role === "user"
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-200 bg-white text-slate-800",
                    )}
                  >
                    {message.role === "assistant" ? (
                      <Markdown
                        content={message.text || (message.status === "streaming" ? "正在思考..." : "")}
                        streaming={message.status === "streaming"}
                      />
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
              ))}

              {tools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tools.slice(-6).map((tool) => (
                    <span
                      key={tool.id}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {tool.label}
                      {tool.status === "running" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {error ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-300 bg-white p-3 shadow-sm focus-within:ring-4 focus-within:ring-emerald-100">
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            multiple
            accept=".md,.markdown,.txt,.csv,.json,.yaml,.yml,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
            onChange={(event) => void uploadFiles(event.target.files)}
          />
          <textarea
            className="min-h-20 w-full resize-none border-0 bg-transparent px-1 py-1 text-base text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="输入任务，@ 引用文档，/ 执行常用命令"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (event.target.value.includes("@")) setDocPickerOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex min-w-0 items-center gap-3 text-sm text-slate-500">
              <button
                className="rounded-lg p-1 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setDocPickerOpen((value) => !value);
                  void loadDocuments();
                }}
                title="引用文档"
                type="button"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <span className="inline-flex items-center gap-1 text-slate-900">
                <MessageSquare className="h-4 w-4" />
                Pro
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-4 w-4" />
                {busy ? "生成中" : "待命"}
              </span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <FileText className="h-4 w-4" />
                {selectedDocs.length > 0 ? `已引用 ${selectedDocs.length} 个文档` : "@ 引用文档"}
              </span>
            </div>
            <Button
              className="h-11 w-11 rounded-full bg-emerald-400 p-0 text-white hover:bg-emerald-500"
              disabled={!input.trim() || busy || !sessionId}
              onClick={submit}
              title="发送"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
          {selectedDocs.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-3">
              {selectedDocs.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDocs((prev) => prev.filter((item) => item.id !== doc.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {docPickerOpen ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-900">引用资料</span>
                <Button
                  ghost
                  className="rounded-lg text-sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  上传文件/图片
                </Button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  value={docSearch}
                  onChange={(event) => setDocSearch(event.target.value)}
                  placeholder="搜索团队文档"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto">
                {filteredDocuments.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-slate-500">
                    还没有可引用文档。去 Documents 页面导入资料后再试。
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-emerald-50"
                      onClick={() => void attachDocument(doc)}
                      type="button"
                    >
                      <span className="text-sm font-medium text-slate-900">{doc.name}</span>
                      <span className="line-clamp-1 text-xs text-slate-500">
                        {doc.source === "local" ? "本地输出 · " : ""}
                        {doc.preview || doc.filename}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
