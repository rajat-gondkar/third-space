"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const CROSSHAIR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="22" y1="12" x2="18" y2="12"/>
  <line x1="6" y1="12" x2="2" y2="12"/>
  <line x1="12" y1="6" x2="12" y2="2"/>
  <line x1="12" y1="22" x2="12" y2="18"/>
</svg>
`;

export function LocateControl() {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: "topleft" });

    control.onAdd = () => {
      const container = L.DomUtil.create(
        "div",
        "leaflet-bar leaflet-control",
      );
      const button = L.DomUtil.create("a", "", container);
      button.href = "#";
      button.title = "Go to my location";
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", "Go to my location");
      button.innerHTML = CROSSHAIR_SVG;
      button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        line-height: 30px;
        color: #333;
        background: #fff;
        border-bottom: 1px solid #ccc;
        text-decoration: none;
        cursor: pointer;
      `;

      // Prevent map interactions when clicking the button
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, "click", (e) => {
        L.DomEvent.preventDefault(e);

        if (!navigator.geolocation) {
          button.style.color = "#999";
          return;
        }

        button.style.color = "#6366f1";
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.flyTo([latitude, longitude], 16, { animate: true });
            button.style.color = "#333";
          },
          () => {
            button.style.color = "#ef4444";
            setTimeout(() => {
              button.style.color = "#333";
            }, 1500);
          },
          { timeout: 8000, enableHighAccuracy: true },
        );
      });

      return container;
    };

    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);

  return null;
}
