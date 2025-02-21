import React, { useState, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import { detectPockets } from "../pocket/detect_pocket";
import adjacencyGraph from "../data/adjacency_graph.json";
import edgeMetadata from "../data/adjacency_graph_edge_metadata.json";
import entityInfo from "../data/entity_geometry_info.json";
import rgbToEntityMap from "../data/rgb_id_to_entity_id_map.json";
import "./model.css";

interface ModelEntity {
  bufferGeometry: THREE.BufferGeometry;
  entityId: string;
  color: string;
  depth?: number;
}

const entityInfoMap = Object.fromEntries(
  entityInfo.map((entity) => [
    entity.entityId,
    {
      entityId: entity.entityId,
      entityType: entity.entityType,
      centerUv: entity.centerUv,
      centerPoint: entity.centerPoint,
      centerNormal: entity.centerNormal,
      area: entity.area,
      minRadius: entity.minRadius,
      minPosRadius: entity.minPosRadius,
      minNegRadius: entity.minNegRadius,
      edgeCurveChains: entity.edgeCurveChains,
    },
  ])
);

export const Model = (): JSX.Element => {
  const [modelEnts, setModelEnts] = useState<ModelEntity[]>([]);
  const [pockets, setPockets] = useState<string[][]>([]);
  const [selectedPocketIndex, setSelectedPocketIndex] = useState<number | null>(
    null
  );
  const [selectedEntities, setSelectedEntities] = useState<string[] | null>(
    null
  );
  const [clickedEntity, setClickedEntity] = useState<string | null>(null);
  const [highlightedEntity, setHighlightedEntity] = useState<string | null>(
    null
  );


  useEffect(() => {
    if (!adjacencyGraph || !edgeMetadata) return;

    const detectedPockets = detectPockets(adjacencyGraph, edgeMetadata);
    setPockets(detectedPockets);

    new GLTFLoader().load("./colored_glb.glb", (gltf) => {
      const newModelEntities: ModelEntity[] = [];

      gltf.scene.traverse((element) => {
        if (element.type !== "Mesh") return;

        const meshElement = element as THREE.Mesh;
        const material = meshElement.material as THREE.MeshStandardMaterial;

        if (!material.color) return;

        const color = material.color;
        const rgbId = `${Math.round(color.r * 255)}-${Math.round(
          color.g * 255
        )}-${Math.round(color.b * 255)}`;
        const entityId = rgbToEntityMap[rgbId];

        if (!entityId) return;

        newModelEntities.push({
          bufferGeometry: meshElement.geometry,
          entityId,
          color: `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`,
          depth: entityInfoMap[entityId]?.centerNormal?.[2],
        });
      });

      setModelEnts(newModelEntities);
    });
  }, []);


  // Handle pocket dropdown selection
  const handlePocketSelection = (index: number) => {
    setSelectedPocketIndex(index);
    setSelectedEntities(pockets[index]);
    setClickedEntity(null);
    setHighlightedEntity(null);
  };

  const handleEntityClick = (entityId: string) => {
    if (highlightedEntity === entityId) {
      setHighlightedEntity(null); // Deselect if clicked again
      setClickedEntity(null);
      setSelectedEntities(null);
      setSelectedPocketIndex(null);
    } else {
      const pocket = pockets.find((pocket) => pocket.includes(entityId));
      if (pocket) {
        setClickedEntity(entityId);
        setHighlightedEntity(entityId); // Highlight only the clicked entity
        setSelectedEntities([
          entityId,
          ...pocket.filter((id) => id !== entityId),
        ]);
        setSelectedPocketIndex(pockets.indexOf(pocket));
      }
    }
  };

  // Highlighting logic
  const getEntityColor = (entityId: string) => {
    if (highlightedEntity === entityId) return "#bac334"; // Highlight the selected entity
    if (selectedEntities?.includes(entityId)) return "#c88204"; // Highlight pocket entities
    return "#dde9f7";
  };

  return (
    <div className="main-body">
      {/* Left side: 3D Canvas */}
      <div className="canvas-container">
        <Canvas className="canvas-block" camera={{ position: [0, 0, 300] }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <OrbitControls />
          <group>
            {modelEnts.map((ent, index) => {
              const isPocketEntity = pockets.some((pocket) =>
                pocket.includes(ent.entityId)
              );
              return (
                <mesh
                  key={index}
                  geometry={ent.bufferGeometry}
                  onClick={() => handleEntityClick(ent.entityId)} // Handle entity click for pockets only
                >
                  <meshStandardMaterial
                    metalness={1} // Fully metallic for a chrome-like effect
                    roughness={0.8} // Low roughness for a glossy finish
                    envMapIntensity={0.7} // Subtle reflections
                    normalScale={new THREE.Vector2(1, 1)} // Enhance depth effect
                    color={getEntityColor(ent.entityId)}
                  />
                </mesh>
              );
            })}
          </group>
        </Canvas>

        {/* Dropdown for Pocket Selection */}
        <div className="bottom-module">
          <div className="bottom-module-container">
            <label>Pocket: </label>
            <select
              value={selectedPocketIndex ?? ""}
              onChange={(e) => handlePocketSelection(parseInt(e.target.value))}
            >
              <option value="">Select a Pocket</option>
              {pockets.map((pocket, index) => (
                <option key={index} value={index}>
                  Pocket {index + 1} ({pocket.length} faces)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right side: Pocket & Entity Details */}
      <div className="right-module">
        {selectedEntities ? (
          <div className="pocket-parent">
            {clickedEntity && (
              <p>
                <strong>Pocket:</strong>{" "}
                {selectedPocketIndex !== null
                  ? ` ${selectedPocketIndex + 1}`
                  : "N/A"}
              </p>
            )}
            <div className="pocket-grid">
              {selectedEntities.map((entityId) => {
                const metadata = entityInfoMap[entityId];
                const isSelected = entityId === highlightedEntity;

                return (
                  <div
                    key={entityId}
                    className="pocket-squares"
                    style={{
                      backgroundColor: isSelected ? "#bac334" : "#163789",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setHighlightedEntity(entityId); // Highlight the clicked entity
                      setClickedEntity(entityId); // Ensure entity reflects in the canvas
                    }}
                  >
                    <h4>
                      {isSelected
                        ? `🔹 Selected Entity ID: ${entityId}`
                        : `Entity ID: ${entityId}`}
                    </h4>
                    {metadata ? (
                      <ul>
                        <li>
                          <strong>Type:</strong> {metadata.entityType}
                        </li>
                        <li>
                          <strong>Depth (Z):</strong>{" "}
                          {metadata.centerNormal?.[2]?.toFixed(2) ?? "N/A"}
                        </li>
                        <li>
                          <strong>Area:</strong>{" "}
                          {metadata.area?.toFixed(2) ?? "N/A"}
                        </li>
                        <li>
                          <strong>Center Point:</strong>{" "}
                          {metadata.centerPoint?.join(", ") ?? "N/A"}
                        </li>
                        <li>
                          <strong>Min Radius:</strong>{" "}
                          {metadata.minRadius?.toFixed(2) ?? "N/A"}
                        </li>
                      </ul>
                    ) : (
                      <p>No metadata available.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                setSelectedEntities(null);
                setClickedEntity(null);
                setHighlightedEntity(null);
              }}
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <p> Select an entity or pocket to view details.</p>
        )}
      </div>
    </div>
  );
};
