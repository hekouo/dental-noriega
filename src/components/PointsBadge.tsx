// src/components/PointsBadge.tsx

export default function PointsBadge({ points }: { points: number }) {
  if (!points || points < 1) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l2.39 4.84 5.34.78-3.86 3.76.91 5.31L12 14.9l-4.78 2.79.91-5.31L4.27 7.62l5.34-.78L12 2z" />
      </svg>
      {points} pts
    </span>
  );
}
