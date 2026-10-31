import { Component } from "react";

export const pct = (fraction) => (fraction === null || fraction === undefined ? "-" : `${Math.round(fraction * 100)}%`);

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, action, className = "", children }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Loading() {
  return (
    <div role="status" className="py-10 text-center text-sm text-slate-500">
      Loading...
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
