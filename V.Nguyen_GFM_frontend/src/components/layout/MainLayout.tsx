import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { AIChatPanel } from "./AIChatPanel";

export function MainLayout() {
  return (
    <div className="h-screen flex flex-col bg-background/90 overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <AIChatPanel />
      </div>
    </div>
  );
}
