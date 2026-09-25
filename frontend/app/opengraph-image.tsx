import { ImageResponse } from "next/og";
import { site } from "@/lib/config";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #000000 0%, #04211e 100%)",
        color: "#f2f5f5",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "#2dd4bf",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 800,
            color: "#04211e",
          }}
        >
          N
        </div>
        <div style={{ fontSize: 40, fontWeight: 800 }}>Nexus AI</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 950 }}>
          {site.tagline}
        </div>
        <div style={{ fontSize: 30, color: "#b4bdbc", maxWidth: 950 }}>
          Web search, your documents, Think mode and the models you choose, built on LangGraph.
        </div>
      </div>
    </div>,
    size,
  );
}
