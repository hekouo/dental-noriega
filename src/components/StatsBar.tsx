import React from "react";
import { Users, Star, Award, Clock } from "lucide-react";

type IconType = "users" | "star" | "medal" | "clock";

type Item = {
  value: string;
  label: string;
  icon: IconType;
  tint?: string;
};

type Props = {
  items: Item[];
};

function Icon({ name }: { name: IconType }) {
  const iconProps = { size: 24, strokeWidth: 2 };

  switch (name) {
    case "users":
      return <Users {...iconProps} />;
    case "star":
      return <Star {...iconProps} />;
    case "medal":
      return <Award {...iconProps} />;
    case "clock":
      return <Clock {...iconProps} />;
  }
}

const StatsBar: React.FC<Props> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((it, i) => (
        <div key={i} className="text-center">
          <div
            className={`mx-auto mb-3 w-14 h-14 rounded-full flex items-center justify-center ${
              it.tint ?? "bg-gray-50"
            }`}
          >
            <Icon name={it.icon} />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            {it.value}
          </div>
          <div className="text-sm text-gray-600">{it.label}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
