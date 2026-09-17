"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Wrench,
  Recycle,
  HeartHandshake,
  Navigation,
  Phone,
  Clock,
  Star,
  Search,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles
} from "lucide-react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

export interface LocalDropoffCenter {
  name: string;
  center_type: string;
  category?: "RECYCLE" | "REPAIR" | "DONATE";
  address_or_channel: string;
  contact_or_link: string;
  phone?: string;
  pincode?: string;
  distance_km?: string;
  latitude?: number;
  longitude?: number;
  timing?: string;
  rating?: string;
}

interface NearbyMapVisualizerProps {
  initialCenters: LocalDropoffCenter[];
  initialLocation: string;
  deviceBrand?: string;
  deviceCategory?: string;
}

export default function NearbyMapVisualizer({
  initialCenters,
  initialLocation,
  deviceBrand = "Multi-Brand",
  deviceCategory = "Electronics"
}: NearbyMapVisualizerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersGroupRef = useRef<LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());

  // Extract initial PIN code or default to 560001
  const pinMatch = initialLocation.match(/\b([1-9][0-9]{5})\b/);
  const defaultPin = pinMatch ? pinMatch[1] : (initialLocation.includes("Bengaluru") ? "560001" : initialLocation.slice(0, 20) || "560001");

  const [pincodeInput, setPincodeInput] = useState(defaultPin);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "RECYCLE" | "REPAIR" | "DONATE">("ALL");
  const [centers, setCenters] = useState<LocalDropoffCenter[]>(initialCenters);
  const [selectedCenter, setSelectedCenter] = useState<LocalDropoffCenter | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  // Update centers when initialCenters changes
  useEffect(() => {
    if (initialCenters && initialCenters.length > 0) {
      setCenters(initialCenters);
    }
  }, [initialCenters]);

  // Initialize Leaflet Map on client mount
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      // Clean up any stale _leaflet_id left on the DOM node by fast unmount / StrictMode
      if ((mapContainerRef.current as any)._leaflet_id) {
        try {
          delete (mapContainerRef.current as any)._leaflet_id;
        } catch {
          (mapContainerRef.current as any)._leaflet_id = null;
        }
      }

      // Default center fallback (Bengaluru)
      const defaultLat = centers[0]?.latitude || 12.9716;
      const defaultLon = centers[0]?.longitude || 77.5946;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLon],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      if (!isMounted) {
        map.remove();
        return;
      }

      // Add modern zoom controls to top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Dark Matter CartoDB tiles for futuristic dark theme
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd"
        }
      ).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Render markers for current centers
      renderMarkers(L, map, markersGroup, centers, activeFilter);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        try {
          delete (mapContainerRef.current as any)._leaflet_id;
        } catch {
          (mapContainerRef.current as any)._leaflet_id = null;
        }
      }
      markersGroupRef.current = null;
    };
  }, []);

  // Update markers whenever centers or activeFilter changes
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = (await import("leaflet")).default;
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      renderMarkers(L, mapInstanceRef.current, markersGroupRef.current, centers, activeFilter);
    }
    updateMarkers();
  }, [centers, activeFilter]);

  function getCategoryColor(category?: string) {
    if (category === "REPAIR") return { bg: "#f59e0b", border: "#d97706", glow: "rgba(245, 158, 11, 0.4)", text: "text-amber-400" };
    if (category === "DONATE") return { bg: "#a855f7", border: "#9333ea", glow: "rgba(168, 85, 247, 0.4)", text: "text-purple-400" };
    return { bg: "#10b981", border: "#059669", glow: "rgba(16, 185, 129, 0.4)", text: "text-emerald-400" };
  }

  function renderMarkers(
    L: any,
    map: LeafletMap,
    markersGroup: LayerGroup,
    allCenters: LocalDropoffCenter[],
    filter: "ALL" | "RECYCLE" | "REPAIR" | "DONATE"
  ) {
    markersGroup.clearLayers();
    markersMapRef.current.clear();

    const filtered = allCenters.filter((c) => {
      if (filter === "ALL") return true;
      return c.category === filter;
    });

    if (filtered.length === 0) return;

    const bounds: [number, number][] = [];

    filtered.forEach((center, idx) => {
      const lat = center.latitude;
      const lon = center.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return;

      bounds.push([lat, lon]);

      const isRepair = center.category === "REPAIR";
      const isDonate = center.category === "DONATE";

      // SVG Icon based on category
      const iconSvg = isRepair
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
        : isDonate
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 3.84 5.92A1.83 1.83 0 0 1 5.41 3.25h9.18a1.83 1.83 0 0 1 1.57.882l2.36 4.088"/><path d="m12 3 3 3-3 3"/></svg>`;

      const colors = getCategoryColor(center.category);

      const markerHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: ${colors.bg};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 18px ${colors.glow}, 0 4px 8px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          ${iconSvg}
          <div style="
            position: absolute;
            bottom: -6px;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid ${colors.bg};
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: `custom-pin-${idx}`,
        html: markerHtml,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
        popupAnchor: [0, -42]
      });

      const popupContent = `
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          color: #0f172a;
          padding: 8px 6px;
          max-width: 260px;
        ">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 2px 8px;
              border-radius: 9999px;
              background: ${colors.bg}22;
              color: ${colors.bg};
              border: 1px solid ${colors.bg}55;
            ">
              ${center.center_type}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #64748b; margin-left: auto;">
              ${center.distance_km || "~2 km"}
            </span>
          </div>

          <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; line-height: 1.3; color: #0f172a;">
            ${center.name}
          </h4>

          <p style="margin: 0 0 6px; font-size: 12px; color: #475569; line-height: 1.4;">
            ${center.address_or_channel}
          </p>

          ${
            center.phone
              ? `<div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-bottom: 8px;">
                  📞 ${center.phone}
                </div>`
              : ""
          }

          <a href="${center.contact_or_link}" target="_blank" rel="noopener noreferrer" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            background: #0f172a;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            box-sizing: border-box;
          ">
            Open in Google Maps ↗
          </a>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: customIcon })
        .bindPopup(popupContent, { maxWidth: 280, className: "custom-leaflet-popup" })
        .addTo(markersGroup);

      marker.on("click", () => {
        setSelectedCenter(center);
      });

      markersMapRef.current.set(center.name, marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  // Fly to selected center
  function focusOnCenter(center: LocalDropoffCenter) {
    setSelectedCenter(center);
    if (!mapInstanceRef.current || typeof center.latitude !== "number" || typeof center.longitude !== "number") return;

    mapInstanceRef.current.flyTo([center.latitude, center.longitude], 15, { duration: 1.2 });
    const marker = markersMapRef.current.get(center.name);
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  }

  // Dynamic PIN code search
  async function handleSearchPincode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanPin = pincodeInput.trim();
    if (!cleanPin) return;

    setLoading(true);
    setSearchMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const res = await fetch(
        `${apiBase}/api/nearby-centers?pincode=${encodeURIComponent(cleanPin)}&brand=${encodeURIComponent(deviceBrand)}&category=${encodeURIComponent(deviceCategory)}`
      );
      if (!res.ok) throw new Error("Failed to fetch centers for this PIN code");

      const data = await res.json();
      if (data.centers && data.centers.length > 0) {
        setCenters(data.centers);
        setSelectedCenter(null);
        setSearchMsg(`Found ${data.centers.length} facilities near PIN ${cleanPin}`);
      } else {
        setSearchMsg(`No direct facilities indexed for ${cleanPin}. Showing regional options.`);
      }
    } catch (err: any) {
      setSearchMsg(`Lookup error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const recyclersCount = centers.filter((c) => c.category === "RECYCLE").length;
  const repairCount = centers.filter((c) => c.category === "REPAIR").length;
  const donateCount = centers.filter((c) => c.category === "DONATE").length;

  const filteredCenters = centers.filter((c) => {
    if (activeFilter === "ALL") return true;
    return c.category === activeFilter;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Hyper-Local Infrastructure Discovery</span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Sparkles className="w-2.5 h-2.5" /> PIN-Calibrated
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Nearby Recyclers, Repair Hubs & Drop-offs
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Locate certified e-waste dismantlers, verified repair specialists, and donation points near your postal PIN code.
          </p>
        </div>

        {/* PIN Code Search Form */}
        <form
          onSubmit={handleSearchPincode}
          className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-2xl p-1.5 shadow-inner"
        >
          <div className="flex items-center gap-2 px-3 py-1 text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">PIN:</span>
          </div>
          <input
            type="text"
            value={pincodeInput}
            onChange={(e) => setPincodeInput(e.target.value)}
            placeholder="e.g. 560001, 600001"
            className="w-28 sm:w-36 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
            maxLength={10}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Locate</span>
          </button>
        </form>
      </div>

      {searchMsg && (
        <div className="mt-4 px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between">
          <span>{searchMsg}</span>
          <button onClick={() => setSearchMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Tabs & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === "ALL"
                ? "bg-slate-700 text-white shadow-md border border-slate-600"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Channels ({centers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("RECYCLE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === "RECYCLE"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30 border border-emerald-500"
                : "bg-slate-950/60 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-900/40"
            }`}
          >
            <Recycle className="w-3.5 h-3.5" />
            <span>E-Waste Recyclers ({recyclersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("REPAIR")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === "REPAIR"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/30 border border-amber-500"
                : "bg-slate-950/60 text-amber-400 hover:bg-amber-950/30 border border-amber-900/40"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Repair Specialists ({repairCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("DONATE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === "DONATE"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/30 border border-purple-500"
                : "bg-slate-950/60 text-purple-400 hover:bg-purple-950/30 border border-purple-900/40"
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Donation Centers ({donateCount})</span>
          </button>
        </div>

        {/* Map Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Recycler</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Repair Shop</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Donation</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Facilities List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-2 relative z-10">
        {/* Left: Leaflet Map Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col h-[380px] sm:h-[460px] relative">
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            style={{ background: "#0f172a" }}
          />

          {/* Map Overlay Badge */}
          <div className="absolute top-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-[11px] flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Live PIN Area:</span>
            <span className="font-mono text-emerald-400 font-bold">{pincodeInput}</span>
          </div>

          <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-[10px] text-slate-400 flex items-center gap-2">
            <span>🗺️ Click any marker to view contact and directions</span>
          </div>
        </div>

        {/* Right: Scrollable Facilities Cards (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[380px] sm:h-[460px] overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
            <span>Showing {filteredCenters.length} verified facilities</span>
            <span className="text-[11px] text-slate-500">Sorted by distance</span>
          </div>

          <div className="overflow-y-auto pr-1 space-y-2.5 flex-1 custom-scrollbar">
            {filteredCenters.map((center, idx) => {
              const isSelected = selectedCenter?.name === center.name;
              const isRepair = center.category === "REPAIR";
              const isDonate = center.category === "DONATE";

              return (
                <div
                  key={idx}
                  onClick={() => focusOnCenter(center)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/50 scale-[1.01]"
                      : "bg-slate-950/60 hover:bg-slate-850/80 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isRepair
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : isDonate
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {center.center_type}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                      <Navigation className="w-3 h-3" />
                      {center.distance_km || "~2 km"}
                    </span>
                  </div>

                  <h4 className="font-semibold text-white text-sm leading-snug line-clamp-1">
                    {center.name}
                  </h4>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {center.address_or_channel}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      {center.rating && (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {center.rating}
                        </span>
                      )}
                      {center.phone && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {center.phone}
                        </span>
                      )}
                    </div>

                    <a
                      href={center.contact_or_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                    >
                      <span>Directions</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}

            {filteredCenters.length === 0 && (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/60 text-slate-400 text-xs">
                No centers found in this category for PIN {pincodeInput}. Try switching filters or updating your PIN code.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
