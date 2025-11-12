import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  // Dibujo simple para pasar build. No usar node APIs.
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderRadius: 6,
          fontSize: 20,
        }}
      >
        🦷
      </div>
    ),
    { ...size }
  );
}
