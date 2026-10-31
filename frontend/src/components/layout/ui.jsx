import { Component } from "react";

export const pct = (fraction) => (fraction === null || fraction === undefined ? "-" : `${Math.round(fraction * 100)}%`);

const BUTTON_VARIANTS = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

// Shared so a <button> and a <Link> styled as one stay identical.
export function buttonClass(variant = "primary") {
  return `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${BUTTON_VARIANTS[variant]}`;
}

export const fieldClass = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900";

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, action, className = "", children }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && (
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className="mt-1 text-[1.65rem] leading-tight font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// A 0 to 1 value as a thin bar. Callers show the number beside it.
export function Meter({ value, className = "bg-brand-600" }) {
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
  return (
    <div aria-hidden className="h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${className}`} style={{ width }} />
    </div>
  );
}

export function Loading() {
  return (
    <div role="status" className="animate-pulse space-y-3 py-4">
      <span className="sr-only">Loading...</span>
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-5/6 rounded bg-slate-100" />
      <div className="h-4 w-2/3 rounded bg-slate-100" />
    </div>
  );
}

export function ErrorNotice({ error, onRetry }) {
  const message = error?.status === 403 ? "This view is available to HR only." : error?.message || "Something went wrong.";
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{message}</p>
      {onRetry && error?.status !== 403 && (
        <button onClick={onRetry} className="mt-2 font-medium underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="py-8 text-center text-sm text-slate-500">{children}</p>;
}

// Renders the loading, error and empty states shared by every page section.
export function Async({ state, isEmpty, emptyText = "Nothing to show yet.", children }) {
  const { data, error, loading, reload } = state;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (!data) return null;
  if (isEmpty?.(data)) return <Empty>{emptyText}</Empty>;
  return children(data);
}

// Stops one page with an unexpected API shape from blanking the whole app.
export class PageBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorNotice error={{ message: `This page could not render: ${this.state.error.message}` }} />;
    }
    return this.props.children;
  }
}

const TREND_STYLES = {
  emerging: "bg-emerald-100 text-emerald-800",
  stable: "bg-slate-100 text-slate-700",
  declining: "bg-amber-100 text-amber-800",
};

export function TrendBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TREND_STYLES[status] || TREND_STYLES.stable}`}>
      {status}
    </span>
  );
}
