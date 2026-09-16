import { useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { attemptStore } from "../storage";

export function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    const json = await attemptStore.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ifl-practice-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage("Exported. Save the downloaded file somewhere safe.");
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      await attemptStore.importAll(text);
      setMessage("Import complete. Your attempts have been merged in.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed — the file may not be a valid export.");
    }
  }

  async function handleClear() {
    const ok = window.confirm("This deletes every attempt on this device. This cannot be undone. Continue?");
    if (!ok) return;
    await attemptStore.clearAll();
    setMessage("All local data cleared.");
  }

  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>

      {message && (
        <p role="status" className="mb-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          {message}
        </p>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Backup</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          This app has no account and no server. Everything lives in this browser only — clearing your browser data
          (or switching phones) erases your attempt history unless you back it up here.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleExport} className="tap-target rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white">
            Export attempts
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="tap-target rounded-lg border border-slate-300 px-4 text-sm font-medium dark:border-slate-700"
          >
            Import attempts
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Danger zone</h2>
        <button type="button" onClick={handleClear} className="tap-target rounded-lg border border-rose-300 px-4 text-sm font-medium text-rose-700 dark:border-rose-800 dark:text-rose-400">
          Clear all local data
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">About &amp; privacy</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>No accounts, no login, no server. Nothing you do here is sent anywhere.</li>
          <li>No third-party scripts and no tracking or analytics of any kind.</li>
          <li>Works offline after your first visit; papers are cached the first time you open them.</li>
          <li>Each paper displays its source. Only papers with cleared publishing permission are shown.</li>
        </ul>
      </section>
    </Layout>
  );
}
