import { useCallback, useEffect, useState } from "react";
import { useRole } from "../components/layout/RoleContext.jsx";

// Loads data on mount and whenever deps or the demo role change. Stale responses are ignored.
export function useApi(load, deps = []) {
  const { role } = useRole();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, error: null, loading: true }));
    load()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, role, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, reload };
}
