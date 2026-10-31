import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getRole, setRole as storeRole } from "../../api.js";

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(getRole);
  const setRole = useCallback((next) => {
    storeRole(next);
    setRoleState(next);
  }, []);
  const value = useMemo(() => ({ role, setRole }), [role, setRole]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
