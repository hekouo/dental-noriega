import { ImageResponse } from "next/og";

export const size = { width: 48, height: 48 };
export const contentType = "image/x-icon";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 32,
          background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        🦷
      </div>
    ),
    {
      ...size,
    },
  );
}

