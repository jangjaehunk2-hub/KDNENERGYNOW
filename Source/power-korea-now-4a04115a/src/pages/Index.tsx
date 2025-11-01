import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MapView from "@/components/MapView";
import { toast } from "sonner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("map");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    if (tab !== "map") {
      toast.info(`${tab.charAt(0).toUpperCase() + tab.slice(1)} 기능은 곧 제공될 예정입니다!`);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      {activeTab === "map" && <MapView />}
    </div>
  );
};

export default Index;
