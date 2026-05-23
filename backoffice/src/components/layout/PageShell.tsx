import type { ReactNode } from "react";
import Topbar from "./Topbar";

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} actions={actions} />
      {children}
    </>
  );
}
