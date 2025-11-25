import { useEffect, useRef } from "react"; // useState 제거
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapView = ({ isActive }: { isActive: boolean }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  // hoverPlant state 제거

  useEffect(() => {
    if (!isActive || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView([37.5665, 126.9780], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const powerPlants = [
      { name: "서울화력발전소", lat: 37.5281, lng: 126.9317, capacity: "800MW" },
      { name: "당진화력발전소", lat: 36.9671, lng: 126.4523, capacity: "6,000MW" },
      { name: "한빛원자력발전소", lat: 35.4037, lng: 126.4162, capacity: "5,875MW" },
    ];

    const markers: L.Marker[] = [];
    powerPlants.forEach((plant) => {
      const divIcon = L.divIcon({
        className: "plant-div-icon",
        html:
          // ↓↓↓ 여기에 'pointer-events: none;'을 추가합니다.
          '<div style="width:14px;height:14px;border-radius:50%;background:#1976d2;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.25); pointer-events: none;"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const marker = L.marker([plant.lat, plant.lng], { icon: divIcon, riseOnHover: true }).addTo(map);
      markers.push(marker);

      // --- 1. 툴팁 컨텐츠 생성 (인라인 스타일 적용) ---
      // Tailwind 클래스는 여기에 직접 적용되지 않습니다.
      const tooltipContent = `
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${plant.name}</div>
        <div style="font-size: 12px; color: #4B5563;">용량: ${plant.capacity}</div>
      `;

      // --- 2. 툴팁 바인딩 ---
      marker.bindTooltip(tooltipContent, {
        direction: 'top',     // 마커 기준 위쪽에 표시
        offset: [0, -9],      // 아이콘 앵커(9px) 위로 띄우기
        sticky: true,         // 마우스를 따라다니도록 (false면 마커에 고정)
        className: 'custom-leaflet-tooltip' // (선택) CSS 스타일링을 위한 클래스
      });
      
      // --- onMouseOver, onMouseMove, onMouseOut 핸들러 모두 제거 ---
    });

    setTimeout(() => map.invalidateSize(), 200);
    mapInstanceRef.current = map;

    return () => {
      try {
        // bindTooltip을 사용하면 .off() 대신 .unbindTooltip()도 
        // 고려할 수 있으나, 마커 자체를 지우므로 .remove()만으로 충분합니다.
        // 여기서는 map.remove()가 모든 레이어를 지우므로 markers.forEach도 불필요할 수 있습니다.
        markers.forEach((m) => m.remove()); // .off() 대신 .remove()가 더 확실합니다.
      } catch (e) {
        /* ignore */
      }

      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isActive]);

  return (
    <div className={`flex-1 flex flex-col p-8 ${!isActive ? "hidden" : ""}`}>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">대한민국 발전소 현황</h1>
        <p className="text-lg text-gray-600">실시간 발전량 모니터링 시스템</p>
      </div>

      <div
        className="flex-1 relative rounded-2xl shadow-xl overflow-hidden border-2"
        style={{ minHeight: "600px" }}
      >
        <div
          ref={mapRef}
          id="map"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
          }}
        />
        
        {/* React 렌더드 툴팁 제거 - Leaflet이 직접 처리합니다. */}
        {/* {hoverPlant && ( ... )} 블록 전체 제거 */}

      </div>
    </div>
  );
};

export default MapView;