import { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import FilterTabs from "./FilterTabs";

// Sample power plant data
const powerPlants = [
  {
    id: "1",
    name: "서울 태양광 발전소",
    type: "solar" as const,
    location: "서울시 강남구",
    capacity: 15000,
    generation: 12500,
    position: { x: 52, y: 35 },
  },
  {
    id: "2",
    name: "부산 수력 발전소",
    type: "hydro" as const,
    location: "부산시 해운대구",
    capacity: 25000,
    generation: 22000,
    position: { x: 75, y: 75 },
  },
  {
    id: "3",
    name: "대전 원자력 발전소",
    type: "nuclear" as const,
    location: "대전시 유성구",
    capacity: 50000,
    generation: 48000,
    position: { x: 45, y: 50 },
  },
  {
    id: "4",
    name: "제주 풍력 발전소",
    type: "wind" as const,
    location: "제주시 서귀포",
    capacity: 18000,
    generation: 15000,
    position: { x: 25, y: 90 },
  },
  {
    id: "5",
    name: "인천 태양광 발전소",
    type: "solar" as const,
    location: "인천시 연수구",
    capacity: 12000,
    generation: 10000,
    position: { x: 48, y: 30 },
  },
  {
    id: "6",
    name: "경주 원자력 발전소",
    type: "nuclear" as const,
    location: "경상북도 경주시",
    capacity: 60000,
    generation: 55000,
    position: { x: 70, y: 55 },
  },
  {
    id: "7",
    name: "강릉 풍력 발전소",
    type: "wind" as const,
    location: "강원도 강릉시",
    capacity: 20000,
    generation: 17000,
    position: { x: 85, y: 25 },
  },
  {
    id: "8",
    name: "광주 수력 발전소",
    type: "hydro" as const,
    location: "광주시 북구",
    capacity: 22000,
    generation: 19500,
    position: { x: 30, y: 70 },
  },
];

const MapView = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const filteredPlants = useMemo(() => {
    if (activeFilter === "all") return powerPlants;
    return powerPlants.filter((plant) => plant.type === activeFilter);
  }, [activeFilter]);

  const totalGeneration = useMemo(() => {
    return filteredPlants.reduce((sum, plant) => sum + plant.generation, 0);
  }, [filteredPlants]);

  // 실제 한국 좌표로 변환 (기존 % 좌표를 실제 위경도로)
  const getActualCoordinates = (position: { x: number; y: number }) => {
    // x: 0-100% -> 경도: 124-132 (대한민국 범위)
    // y: 0-100% -> 위도: 43-33 (북쪽이 낮은 숫자)
    const lng = 124 + (position.x / 100) * 8;
    const lat = 43 - (position.y / 100) * 10;
    return { lat, lng };
  };

  // Leaflet 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 지도 생성
    const map = L.map(mapContainerRef.current, {
      center: [36.5, 127.5], // 대한민국 중심
      zoom: 7,
      minZoom: 6,
      maxZoom: 10,
    });

    // OpenStreetMap 타일 추가
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef.current) return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const colorMap = {
      solar: "hsl(var(--solar))",
      hydro: "hsl(var(--hydro))",
      wind: "hsl(var(--wind))",
      nuclear: "hsl(var(--nuclear))",
    };

    const typeLabels = {
      solar: "태양광",
      hydro: "수력",
      wind: "풍력",
      nuclear: "원자력",
    };

    // 새 마커 추가
    filteredPlants.forEach((plant) => {
      const coords = getActualCoordinates(plant.position);
      
      // 커스텀 아이콘 생성
      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative;">
            <div style="
              width: 32px;
              height: 32px;
              background-color: ${colorMap[plant.type]};
              border: 4px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            "></div>
            <div style="
              position: absolute;
              inset: 0;
              background-color: ${colorMap[plant.type]};
              border-radius: 50%;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              opacity: 0.3;
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(mapRef.current!);

      // 팝업 추가
      const popupContent = `
        <div style="font-family: system-ui; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 12px; height: 12px; background-color: ${colorMap[plant.type]}; border-radius: 50%;"></div>
            <h3 style="font-weight: bold; font-size: 16px; margin: 0;">${plant.name}</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">유형:</span>
              <span style="font-weight: 500;">${typeLabels[plant.type]}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">위치:</span>
              <span style="font-weight: 500;">${plant.location}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">용량:</span>
              <span style="font-weight: 500;">${plant.capacity.toLocaleString()} kWh</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #eee;">
              <span style="color: #666;">현재 발전량:</span>
              <span style="font-weight: bold; font-size: 16px; color: ${colorMap[plant.type]};">
                ${plant.generation.toLocaleString()} kWh
              </span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });
  }, [filteredPlants]);

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-foreground">
          대한민국 발전소 현황
        </h1>
        <p className="text-lg text-muted-foreground">
          실시간 발전량 모니터링 시스템
        </p>
      </div>

      <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <div className="flex-1 relative rounded-2xl shadow-xl overflow-hidden border-2 border-border">
        {/* Leaflet Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Stats Card */}
        <div className="absolute bottom-8 right-8 bg-card border-2 border-border rounded-xl shadow-xl p-6 min-w-[280px]">
          <h3 className="text-lg font-bold mb-4 text-foreground">
            발전 현황 요약
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">활성 발전소:</span>
              <span className="text-2xl font-bold text-foreground">
                {filteredPlants.length}개
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-sm text-muted-foreground mb-1">총 발전량</div>
              <div className="text-3xl font-bold text-[hsl(var(--accent))]">
                {totalGeneration.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">kWh</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
