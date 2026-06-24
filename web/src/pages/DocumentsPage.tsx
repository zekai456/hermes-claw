import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@nous-research/ui/ui/components/button";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/Markdown";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api, type DocumentDetail, type DocumentInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "文档加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) =>
      `${doc.name} ${doc.filename} ${doc.preview}`.toLowerCase().includes(q),
    );
  }, [documents, search]);

  const save = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api.createDocument({ name: name.trim(), content });
      setName("");
      setContent("");
      showToast("文档已保存", "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const readFiles = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      for (const file of selected) {
        await api.uploadDocument(file);
      }
      showToast(`已导入 ${selected.length} 个文件`, "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "导入失败", "error");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteDocument(id);
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedDoc(null);
      }
      showToast("文档已删除", "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "删除失败", "error");
    }
  };

  const openDocument = async (doc: DocumentInfo) => {
    setSelectedId(doc.id);
    setViewLoading(true);
    try {
      const detail = await api.getDocument(doc.id);
      setSelectedDoc(detail);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "文档打开失败", "error");
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Toast toast={toast} />
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[340px_380px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新增文档
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="文档名称，例如：小红书品牌规范"
            />
            <textarea
              className="min-h-[280px] resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="粘贴 Markdown、TXT、会议纪要、产品资料、选题库..."
            />
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              multiple
              accept=".md,.markdown,.txt,.csv,.json,.yaml,.yml,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
              onChange={(event) => void readFiles(event.target.files)}
            />
            <div className="flex gap-2">
              <Button
                ghost
                className="rounded-lg"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                导入文件
              </Button>
              <Button
                className="rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                disabled={!name.trim() || !content.trim() || saving}
                onClick={save}
              >
                {saving ? <Spinner /> : null}
                保存
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                团队文档库
              </CardTitle>
              <Button ghost size="icon" className="rounded-lg" onClick={load}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索文档名称或摘要"
              />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                <Spinner />
                <span className="ml-2">加载中...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-slate-500">
                <FileText className="mb-3 h-10 w-10 text-slate-300" />
                还没有文档，先导入一份团队资料。
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((doc) => (
                  <article
                    key={doc.id}
                    className={cn(
                      "cursor-pointer rounded-xl border bg-white p-4 shadow-sm",
                      "transition hover:border-emerald-300 hover:shadow-md",
                      selectedId === doc.id
                        ? "border-emerald-300 ring-4 ring-emerald-50"
                        : "border-slate-200",
                    )}
                    onClick={() => void openDocument(doc)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-950">
                          {doc.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.source === "local" ? "本地输出" : "文档库"} · {doc.filename} · {formatSize(doc.size)}
                        </p>
                      </div>
                      {doc.source !== "local" ? (
                        <Button
                          ghost
                          size="icon"
                          className="rounded-lg text-slate-400 hover:text-red-600"
                          onClick={(event) => {
                            event.stopPropagation();
                            void remove(doc.id);
                          }}
                          title="删除文档"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    {doc.preview ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {doc.preview}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              文档查看
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 overflow-y-auto">
            {viewLoading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                <Spinner />
                <span className="ml-2">打开中...</span>
              </div>
            ) : selectedDoc ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-base font-semibold text-slate-950">
                    {selectedDoc.name}
                  </h2>
                  <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                    {selectedDoc.source === "local" ? "本地输出" : "文档库"} · {selectedDoc.filename} · {formatSize(selectedDoc.size)}
                    {selectedDoc.path ? ` · ${selectedDoc.path}` : ""}
                  </p>
                </div>
                <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7">
                  <Markdown content={selectedDoc.content || "这个文档没有可显示的文本内容。"} />
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-slate-500">
                <FileText className="mb-3 h-10 w-10 text-slate-300" />
                点击左侧文档即可查看内容。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
