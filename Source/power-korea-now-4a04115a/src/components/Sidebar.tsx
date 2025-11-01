import { Map, Presentation, Gamepad2, GraduationCap, LogIn } from "lucide-react";
import { Button } from "./ui/button";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const menuItems = [
    { id: "map", label: "Map", icon: Map },
    { id: "slide", label: "Slide", icon: Presentation },
    { id: "game", label: "Game", icon: Gamepad2 },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "login", label: "Login", icon: LogIn },
  ];

  return (
    <aside className="w-36 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              px-6 py-6 flex flex-col items-center gap-2 transition-all duration-200
              hover:bg-[hsl(var(--sidebar-hover))]
              ${isActive ? "bg-[hsl(var(--sidebar-hover))] border-l-4 border-[hsl(var(--sidebar-active))]" : ""}
            `}
          >
            <Icon className={`w-6 h-6 ${isActive ? "text-[hsl(var(--sidebar-active))]" : "text-foreground"}`} />
            <span className={`text-sm font-medium ${isActive ? "text-[hsl(var(--sidebar-active))]" : "text-foreground"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
};

export default Sidebar;
