import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/UI/button";
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  BookOpen,
  History,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analysis", icon: FlaskConical, label: "New Analysis" },
  { to: "/results", icon: FileText, label: "Results" },
  { to: "/notebook", icon: BookOpen, label: "Notebook" },
  { to: "/history", icon: History, label: "Job History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={cn(
        "border-r border-border bg-sidebar flex flex-col transition-all duration-300 ease-in-out",
        isOpen ? "w-56" : "w-14"
      )}
    >
      <div className={cn("flex items-center p-2", isOpen ? "justify-end" : "justify-center")}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                !isOpen && "justify-center px-0"
              )}
              title={!isOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
