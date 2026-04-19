// Lets any child component (e.g. Index.tsx during onboarding) tell AppLayout
// to hide the bottom nav — without prop-drilling through the router tree.
import { createContext, useContext, useState, type ReactNode } from "react";

interface NavCtx {
  hideNav: boolean;
  setHideNav: (v: boolean) => void;
}

const NavContext = createContext<NavCtx>({ hideNav: false, setHideNav: () => {} });

export const useNavContext = () => useContext(NavContext);

export function NavProvider({ children }: { children: ReactNode }) {
  const [hideNav, setHideNav] = useState(false);
  return (
    <NavContext.Provider value={{ hideNav, setHideNav }}>
      {children}
    </NavContext.Provider>
  );
}
