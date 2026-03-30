import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { pageToPath, pathToPage } from "../navigation/routes";
import type { Page } from "../types";

interface NavigationContextType {
  currentPage: Page;
  navigate: (page: Page) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const navigate = useCallback(
    (page: Page) => {
      routerNavigate(pageToPath(page));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [routerNavigate]
  );

  const value = useMemo(
    () => ({
      currentPage: pathToPage(location.pathname),
      navigate,
    }),
    [location.pathname, navigate]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
