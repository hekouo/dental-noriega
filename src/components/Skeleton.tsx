"use client";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export default function Skeleton({ className, children }: Props) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className || ""}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
