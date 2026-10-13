import { ImageResponse } from "next/og";

export const alt = "Toools — curated tool stacks for your entire workflow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: "80px", background: "#faf8f4", color: "#292524" }}>
      <div style={{ display: "flex", fontSize: 36, color: "#b45309", marginBottom: 32 }}>Toools</div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.12 }}>Find the right tools for your entire workflow.</div>
      <div style={{ display: "flex", fontSize: 26, marginTop: 36, color: "#57534e" }}>Curated stacks · Tool comparisons · Practical selection guides</div>
    </div>, size,
  );
}
