<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
    position: { lat: 37.5665, lng: 126.9780 },
  },
  {
    id: "2",
    name: "부산 수력 발전소",
    type: "hydro" as const,
    location: "부산시 해운대구",
    capacity: 25000,
    generation: 22000,
    position: { lat: 35.1796, lng: 129.0756 },
  },
  {
    id: "3",
    name: "대전 원자력 발전소",
    type: "nuclear" as const,
    location: "대전시 유성구",
    capacity: 50000,
    generation: 48000,
    position: { lat: 36.3504, lng: 127.3845 },
  },
  {
    id: "4",
    name: "제주 풍력 발전소",
    type: "wind" as const,
    location: "제주시 서귀포",
    capacity: 18000,
    generation: 15000,
    position: { lat: 33.2890, lng: 126.5603 },
  },
  {
    id: "5",
    name: "인천 태양광 발전소",
    type: "solar" as const,
    location: "인천시 연수구",
    capacity: 12000,
    generation: 10000,
    position: { lat: 37.4563, lng: 126.7052 },
  },
  {
    id: "6",
    name: "경주 원자력 발전소",
    type: "nuclear" as const,
    location: "경상북도 경주시",
    capacity: 60000,
    generation: 55000,
    position: { lat: 35.8562, lng: 129.2247 },
  },
  {
    id: "7",
    name: "강릉 풍력 발전소",
    type: "wind" as const,
    location: "강원도 강릉시",
    capacity: 20000,
    generation: 17000,
    position: { lat: 37.7519, lng: 128.8761 },
  },
  {
    id: "8",
    name: "광주 수력 발전소",
    type: "hydro" as const,
    location: "광주시 북구",
    capacity: 22000,
    generation: 19500,
    position: { lat: 35.1595, lng: 126.8526 },
  },
];

interface MapViewProps {
  isActive: boolean;
}

const MapView = ({ isActive }: MapViewProps) => {
  const [activeFilter, setActiveFilter] = useState("all");
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
=======
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
>>>>>>> Stashed changes

  // ✅ 발전소 데이터 (예시: 위도/경도 기반)
  const powerPlants = [
    { name: "서울화력발전소", lat: 37.5281, lng: 126.9317, capacity: "800MW" },
    { name: "당진화력발전소", lat: 36.9671, lng: 126.4523, capacity: "6,000MW" },
    { name: "한빛원자력발전소", lat: 35.4037, lng: 126.4162, capacity: "5,875MW" },
  ];

<<<<<<< Updated upstream
  const totalGeneration = useMemo(() => {
    return filteredPlants.reduce((sum, plant) => sum + plant.generation, 0);
  }, [filteredPlants]);


  // Leaflet 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !isActive) return;
=======
  useEffect(() => {
=======
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // ✅ 발전소 데이터 (예시: 위도/경도 기반)
  const powerPlants = [
    { name: "서울화력발전소", lat: 37.5281, lng: 126.9317, capacity: "800MW" },
    { name: "당진화력발전소", lat: 36.9671, lng: 126.4523, capacity: "6,000MW" },
    { name: "한빛원자력발전소", lat: 35.4037, lng: 126.4162, capacity: "5,875MW" },
  ];

  useEffect(() => {
>>>>>>> Stashed changes
=======
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapView = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // ✅ 발전소 데이터 (예시: 위도/경도 기반)
  const powerPlants = [
    { name: "서울화력발전소", lat: 37.5281, lng: 126.9317, capacity: "800MW" },
    { name: "당진화력발전소", lat: 36.9671, lng: 126.4523, capacity: "6,000MW" },
    { name: "한빛원자력발전소", lat: 35.4037, lng: 126.4162, capacity: "5,875MW" },
  ];

  useEffect(() => {
>>>>>>> Stashed changes
    const container = mapRef.current;
    if (!container) return;

    // 이미 만들어진 지도 제거
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

    // 지도 생성
    const map = L.map(container).setView([37.5665, 126.9780], 7);

    // 기본 지도 타일
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // ✅ 발전소 마커 추가
    powerPlants.forEach((plant) => {
      L.marker([plant.lat, plant.lng])
        .addTo(map)
        .bindPopup(`<b>${plant.name}</b><br/>용량: ${plant.capacity}`);
    });

    mapInstanceRef.current = map;
<<<<<<< Updated upstream
<<<<<<< Updated upstream

    // 초기화 직후 크기 재계산
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
<<<<<<< Updated upstream
      map.remove();
      mapRef.current = null;
=======
=======

    return () => {
>>>>>>> Stashed changes
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    };
  }, [isActive]);

<<<<<<< Updated upstream
  // 탭이 활성화될 때 지도 크기 재계산
  useEffect(() => {
    if (isActive && mapRef.current) {
      // 약간의 지연을 두고 invalidateSize 호출 (CSS 전환 대기)
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [isActive]);

<<<<<<< Updated upstream
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

      const marker = L.marker([plant.position.lat, plant.position.lng], { icon }).addTo(mapRef.current!);

      // 팝업 추가 (hover 시 열리도록 설정)
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

      // 팝업 바인딩 (autoClose 비활성화)
      marker.bindPopup(popupContent, {
        closeButton: false,
        autoClose: false,
        closeOnClick: false
      });
      
      // 마커와 팝업 모두에 이벤트 추가
      marker.on('mouseover', function() {
        this.openPopup();
      });
      
      marker.on('mouseout', function() {
        this.closePopup();
      });
      
      // 팝업에도 mouseenter/leave 이벤트 추가
      marker.on('popupopen', function() {
        const popup = this.getPopup();
        const popupElement = popup?.getElement();
        
        if (popupElement) {
          popupElement.addEventListener('mouseenter', () => {
            this.openPopup();
          });
          
          popupElement.addEventListener('mouseleave', () => {
            this.closePopup();
          });
        }
      });
      
      markersRef.current.push(marker);
    });
  }, [filteredPlants]);

=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

>>>>>>> Stashed changes
  return (
    <div className={`flex-1 flex flex-col p-8 ${!isActive ? 'hidden' : ''}`}>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">대한민국 발전소 현황</h1>
        <p className="text-lg text-gray-600">실시간 발전량 모니터링 시스템</p>
      </div>

      <div className="flex-1 relative rounded-2xl shadow-xl overflow-hidden border-2" style={{ minHeight: '600px' }}>
        <div
          ref={mapRef}
          id="map"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default MapView;
