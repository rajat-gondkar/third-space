import { ImageResponse } from "next/og";

export const alt =
  "Third Space — discover what's happening near you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          color: "white",
          background: "#0b0716",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(circle at 88% 82%, rgba(236,72,153,0.45), transparent 55%), radial-gradient(circle at 50% 50%, rgba(99,102,241,0.30), transparent 60%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 116,
              height: 116,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 28,
              background:
                "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <svg
              width="68"
              height="68"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M12 2c-4.4 0-8 3.4-8 7.7 0 5.5 6.7 11.4 7.4 12 .3.3.9.3 1.2 0 .7-.6 7.4-6.5 7.4-12C20 5.4 16.4 2 12 2z"
                fill="white"
                fillOpacity={0.22}
              />
              <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: -0.5,
                lineHeight: 1,
              }}
            >
              Third Space
            </div>
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.65)",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Real-life · Right now
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.02,
            }}
          >
            <span style={{ marginRight: 22 }}>Find your</span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #a5b4fc 0%, #d8b4fe 50%, #f9a8d4 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              third space.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 940,
              lineHeight: 1.35,
            }}
          >
            Discover and join real-life activities happening around you — pin-drop precise, no
            sign-ups, in a 6-hour window.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
