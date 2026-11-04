import React, { useRef, useState } from 'react';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { runImport, ImportEntry, ImportReport } from '../services/importer.ts';

export const ImportFromFilePanel: React.FC = () => {
  const { items, mergeImportData } = useMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<ImportReport | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null); setReport(null); setAdded(null);
    try {
      const data = JSON.parse(await file.text());
      const entries: ImportEntry[] = Array.isArray(data?.entries) ? data.entries : [];
      if (!entries.length) throw new Error('This is not a KINO import file (no entries found).');
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      setProgress({ done: 0, total: entries.length });
      const result = await runImport(entries, items, (done, total) => setProgress({ done, total }), ctrl.signal);
      if (ctrl.signal.aborted) { setError('Import cancelled. Nothing was added.'); return; }
      const res = mergeImportData(result.items, [], false);
      setAdded(res.addedCount + res.updatedCount);
      setReport(result);
    } catch (err: any) {
      setError(err?.message || 'Import failed.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="space-y-3 pt-4 border-t border-white/[0.06]">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Import from Letterboxd / Google</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Choose the kino-import.json file. Titles are matched on TMDB, ratings and dates are kept, duplicates are skipped.
        </p>
      </div>
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
      {!busy ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-2.5 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs font-medium text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Choose kino-import.json...</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Matching titles... {progress.done} / {progress.total}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <button type="button" onClick={() => abortRef.current?.abort()} className="text-xs text-slate-400 hover:text-white cursor-pointer">
            Cancel
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {report && (
        <div className="space-y-2 p-3 rounded-lg text-xs bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>
              Added {added} titles. Already in your library: {report.alreadyInLibrary}. Duplicates merged: {report.duplicatesMerged}.
              Not found: {report.unmatched.length}.
            </span>
          </div>
          {report.uncertain.length > 0 && (
            <details className="text-slate-300">
              <summary className="cursor-pointer">Please check {report.uncertain.length} matches that may be wrong</summary>
              <ul className="mt-1 space-y-0.5 list-disc pl-5 break-words">
                {report.uncertain.map((u, i) => (<li key={i}>{u.title} → {u.matchedAs}</li>))}
              </ul>
            </details>
          )}
          {report.unmatched.length > 0 && (
            <details className="text-slate-300">
              <summary className="cursor-pointer">{report.unmatched.length} titles were not found</summary>
              <ul className="mt-1 space-y-0.5 list-disc pl-5 break-words">
                {report.unmatched.map((u, i) => (<li key={i}>{u.title}{u.year ? ` (${u.year})` : ''}</li>))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
};
