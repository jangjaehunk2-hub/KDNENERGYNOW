import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MapView from "@/components/MapView";
import { toast } from "sonner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("map");
  const [mapKey, setMapKey] = useState(0);

  const handleTabChange = (tab: string) => {
    console.log('[Index] handleTabChange ->', tab);
    setActiveTab(tab);

    if (tab !== "map") {
      toast.info(`${tab.charAt(0).toUpperCase() + tab.slice(1)} 기능은 곧 제공될 예정입니다!`);
    }

    // Map 탭으로 전환될 때 전체 페이지를 새로고침하여 초기 상태로 재로딩합니다.
    // (사용자 요청: 창 바꿀때 자동 새로고침)
    if (tab === 'map') {
      console.log('[Index] switching to map tab -> attempting reload');
      // 안전하게 상태 반영 후 새로고침
      window.setTimeout(() => {
        try {
          console.log('[Index] calling window.location.reload()');
          window.location.reload();
        } catch (e) {
          console.warn('[Index] reload failed, falling back to remount', e);
          // 실패 시 fallback으로 remount + map:check
          setMapKey((k) => k + 1);
          window.dispatchEvent(new Event('map:check'));
        }
      }, 120);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
<<<<<<< Updated upstream
<<<<<<< Updated upstream
      <MapView isActive={activeTab === "map"} />
=======
  {activeTab === "map" && <MapView key={mapKey} />}
>>>>>>> Stashed changes
=======
  {activeTab === "map" && <MapView key={mapKey} />}
>>>>>>> Stashed changes
    </div>
  );
};

export default Index;
