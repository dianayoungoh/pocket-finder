import React from "react";

interface LegendProps {
  pockets: string[][];
  entityInfoMap: Record<string, { centerPoint: number[]; area: number }>;
}

const Legend = ({ pockets, entityInfoMap }: LegendProps) => {
  return (
    <div className="legend">
      <h3>Pocket Legend</h3>
      {pockets.map((pocket, index) => (
        <div key={index} className="legend-item">
          <h4>
            Pocket {index + 1} ({pocket.length} faces)
          </h4>
          <ul>
            {pocket.map((entityId) => {
              const info = entityInfoMap[entityId];
              return (
                <li key={entityId}>
                  🆔 <strong>ID:</strong> {entityId} | 📍{" "}
                  <strong>Center:</strong>{" "}
                  {info?.centerPoint
                    ?.map((coord) => coord.toFixed(2))
                    .join(", ") || "N/A"}{" "}
                  | 📏 <strong>Area:</strong> {info?.area?.toFixed(2) ?? "N/A"}{" "}
                  mm²
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Legend;
