import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getPersona, getRole, setPersona as storePersona, setRole as storeRole } from "../../api.js";

const RoleContext = createContext(null);

// `role` is the active view. `personaId` is who the Employee view is signed in as.
export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(getRole);
  const [personaId, setPersonaState] = useState(getPersona);
  const setRole = useCallback((next) => {
    storeRole(next);
    setRoleState(next);
  }, []);
  const setPersonaId = useCallback((next) => {
    storePersona(next);
    setPersonaState(next);
  }, []);
  const value = useMemo(() => ({ role, setRole, personaId, setPersonaId }), [role, setRole, personaId, setPersonaId]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
