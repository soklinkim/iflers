import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Layout({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
      {!hideNav && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <Link to="/" className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
            IFL Practice
          </Link>
          <Link
            to="/settings"
            className="tap-target flex items-center justify-center rounded-full px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Settings
          </Link>
        </header>
      )}
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
