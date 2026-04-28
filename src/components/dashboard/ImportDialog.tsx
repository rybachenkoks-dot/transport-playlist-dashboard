"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import type { PlaylistConfig } from "./types";

interface ImportResult {
  sheet: string;
  type: string;
  rows: number;
  kind: string;
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  config: PlaylistConfig;
  onImported: () => void;
}

const typeLabel: Record<string, string> = {
  transport: "Транспорт",
  mfc: "МФЦ",
  metro: "Метро",
  lift: "Лифт",
  kd: "КД",
};

export function ImportDialog({ open, onClose, config, onImported }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setDragOver(false); setUploading(false); setProgress(0); setResults(null); setError(null); setErrorDetails(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = (f: File) => {
    if (!f.name.match(/\.xlsx?$/i)) { toast.error("Пожалуйста, загрузите файл .xlsx или .xls"); return; }
    if (f.size > 50 * 1024 * 1024) { toast.error("Файл слишком большой (максимум 50 МБ)"); return; }
    setFile(f); setResults(null); setError(null); setErrorDetails(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setProgress(10); setError(null); setErrorDetails(null); setResults(null);
    try {
      const fd = new FormData(); fd.append("file", file); setProgress(30);

      let res: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
        res = await fetch("/api/import", { method: "POST", body: fd, signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (networkError: any) {
        if (networkError?.name === "AbortError") {
          throw new Error("Превышено время ожидания (5 минут). Попробуйте загрузить файл меньшего размера.");
        }
        throw new Error("Сетевая ошибка: нет подключения к серверу. Проверьте интернет и попробуйте снова.");
      }

      setProgress(80);

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Сервер вернул некорректный ответ. Попробуйте ещё раз.");
      }

      setProgress(100);

      if (!res.ok) {
        const errorMsg = data.error || "Неизвестная ошибка сервера";
        const errorDetails = data.details || "";
        throw new Error(errorMsg + (errorDetails ? `\n${errorDetails}` : ""));
      }

      setResults(data.results || []);
      const totalRows = (data.results || []).reduce((s: number, r: ImportResult) => s + r.rows, 0);
      toast.success(`Импортировано ${totalRows} строк`);
      onImported();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Неизвестная ошибка";
      const lines = message.split("\n");
      setError(lines[0]);
      setErrorDetails(lines.length > 1 ? lines.slice(1).join("\n") : null);
      toast.error("Ошибка импорта");
    } finally { setUploading(false); }
  };

  const totalRows = results ? results.reduce((s, r) => s + r.rows, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-xl">
        {results ? (
          /* ===== SUCCESS STATE ===== */
          <>
            <div className="px-5 pt-5 pb-3 text-center shrink-0">
              <div className="w-14 h-14 rounded-full bg-emerald-100 mx-auto mb-3 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-stone-800">Данные загружены</h2>
              <p className="text-sm text-muted-foreground mt-1">Импортировано {totalRows.toLocaleString("ru-RU")} строк</p>
            </div>
            <div className="px-5 pb-5">
              <div className="border border-stone-100 rounded-lg divide-y divide-stone-50 max-h-48 overflow-y-auto custom-scrollbar">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-stone-700 block">{r.sheet}</span>
                        <span className="text-[10px] text-stone-400">
                          {r.kind === "playlist" ? "Плейлист" : "Свод"} · {typeLabel[r.type] || r.type}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-stone-600 bg-stone-50 px-2 py-0.5 rounded">{r.rows} строк</span>
                  </div>
                ))}
              </div>
              <Button onClick={handleClose} className={`w-full mt-4 text-xs text-white ${config.buttonGradient} h-10 rounded-lg`}>
                Готово
              </Button>
            </div>
          </>
        ) : (
          /* ===== UPLOAD STATE ===== */
          <>
            <div className={`bg-gradient-to-r ${config.headerGradient} px-5 pt-5 pb-4 shrink-0`}>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2 text-sm font-semibold">
                  <Upload className="w-4 h-4" />
                  Импорт из Excel
                </DialogTitle>
              </DialogHeader>
              <p className="text-[11px] text-white/40 mt-1">
                Загрузите файл с листами «Плейлист» и/или «Свод»
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-stone-400 bg-stone-50" : file ? "border-emerald-300 bg-emerald-50/30" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/50"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-stone-700">{file.name}</p>
                      <p className="text-xs text-stone-400">{(file.size / 1024).toFixed(1)} КБ</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-2 text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-sm text-stone-500">Перетащите файл сюда или нажмите для выбора</p>
                    <p className="text-xs text-stone-400 mt-1">.xlsx, .xls</p>
                  </div>
                )}
              </div>
              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-stone-600 to-stone-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Импорт данных... Это может занять несколько минут</p>
                </div>
              )}
              {error && (
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  </div>
                  {errorDetails && (
                    <p className="text-[11px] text-red-500 ml-6 whitespace-pre-wrap font-mono">{errorDetails}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1 text-xs" disabled={uploading}>Закрыть</Button>
                <Button onClick={handleUpload} disabled={!file || uploading} className={`flex-1 text-xs text-white ${config.buttonGradient}`}>
                  {uploading ? "Импорт..." : "Загрузить"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
