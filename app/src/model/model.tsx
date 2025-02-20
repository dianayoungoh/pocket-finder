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

interface ModelEntity {
  bufferGeometry: THREE.BufferGeometry;
  entityId: string;
  color: string;
  depth?: number;
}

export const Model = (): JSX.Element => {
  const [modelEnts, setModelEnts] = useState<ModelEntity[]>([]);
  const [pockets, setPockets] = useState<string[][]>([]);
  const [selectedPocketIndex, setSelectedPocketIndex] = useState<number | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[] | null>(null);
  const [clickedEntity, setClickedEntity] = useState<string | null>(null);

  useEffect(() => {
    if (!adjacencyGraph || !edgeMetadata || !entityInfo) return;

    const entityInfoMap = Object.fromEntries(
      entityInfo.map((entity) => [entity.entityId, { centerNormal: entity.centerNormal }])
    );

    const detectedPockets = detectPockets(adjacencyGraph, edgeMetadata, entityInfoMap);
    setPockets(detectedPockets);

    new GLTFLoader().load("./colored_glb.glb", (gltf) => {
      const newModelEntities: ModelEntity[] = [];

      gltf.scene.traverse((element) => {
        if (element.type !== "Mesh") return;

        const meshElement = element as THREE.Mesh;
        const material = meshElement.material as THREE.MeshStandardMaterial;

        if (!material.color) return;

        const color = material.color;
        const rgbId = `${Math.round(color.r * 255)}-${Math.round(color.g * 255)}-${Math.round(color.b * 255)}`;
        const entityId = rgbToEntityMap[rgbId];

        if (!entityId) return;

        const isPocket = detectedPockets.some((pocket) => pocket.includes(entityId));
        const pocketColor = isPocket ? "#afd6de" : `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;

        newModelEntities.push({
          bufferGeometry: meshElement.geometry,
          entityId,
          color: pocketColor,
          depth: entityInfoMap[entityId]?.centerNormal[2],
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
  };

  // Handle entity click and prioritize clicked entity in the right panel
  const handleEntityClick = (entityId: string) => {
    setClickedEntity(entityId);
    const pocket = pockets.find((pocket) => pocket.includes(entityId));
    if (pocket) {
      // Show clicked entity first, followed by other pocket entities
      const sortedPocket = [entityId, ...pocket.filter((id) => id !== entityId)];
      setSelectedEntities(sortedPocket);
      setSelectedPocketIndex(pockets.indexOf(pocket));
    } else {
      setSelectedEntities([entityId]); // Show only the clicked entity if it's not in a pocket
      setSelectedPocketIndex(null);
    }
  };

  // Highlighting logic
  const getEntityColor = (entityId: string) => {
    if (clickedEntity === entityId) return "yellow"; // Highlight clicked entity
    if (selectedEntities?.includes(entityId)) return "yellow"; // Highlight selected pocket entities
    return "rgb(180, 180, 180)";
  };

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

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left side: 3D Canvas */}
      <div style={{ flex: 3, position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 300] }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <OrbitControls />
          <group>
            {modelEnts.map((ent, index) => (
              <mesh
                key={index}
                geometry={ent.bufferGeometry}
                onClick={() => handleEntityClick(ent.entityId)} // Handle entity click
              >
                <meshStandardMaterial
                  metalness={0.5}
                  roughness={0.3}
                  envMapIntensity={0.8}
                  color={getEntityColor(ent.entityId)}
                />
              </mesh>
            ))}
          </group>
        </Canvas>

        {/* Dropdown for Pocket Selection */}
        <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)" }}>
          <label>Select a Pocket: </label>
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

      {/* Right side: Pocket & Entity Details */}
      <div style={{ flex: 1, padding: "10px", overflowY: "auto", borderLeft: "1px solid #ddd" }}>
        {selectedEntities ? (
          <>
            <h3>{clickedEntity ? "Entity Details" : `Pocket ${selectedPocketIndex! + 1} Details`}</h3>
            {selectedEntities.map((entityId) => {
              const metadata = entityInfoMap[entityId];
              return (
                <div
                  key={entityId}
                  style={{
                    marginBottom: "10px",
                    backgroundColor: entityId === clickedEntity ? "#ffd700" : "transparent",
                    padding: "5px",
                    borderRadius: "5px",
                  }}
                >
                  <h4>{entityId === clickedEntity ? `🔹 Selected Entity ID: ${entityId}` : `Entity ID: ${entityId}`}</h4>
                  {metadata ? (
                    <ul>
                      <li><strong>Type:</strong> {metadata.entityType}</li>
                      <li><strong>Depth (Z):</strong> {metadata.centerNormal?.[2]?.toFixed(2) ?? "N/A"}</li>
                      <li><strong>Area:</strong> {metadata.area?.toFixed(2) ?? "N/A"}</li>
                      <li><strong>Center Point:</strong> {metadata.centerPoint?.join(", ") ?? "N/A"}</li>
                      <li><strong>Min Radius:</strong> {metadata.minRadius?.toFixed(2) ?? "N/A"}</li>
                    </ul>
                  ) : (
                    <p>No metadata available.</p>
                  )}
                </div>
              );
            })}
            <button onClick={() => { setSelectedEntities(null); setClickedEntity(null); }}>Clear Selection</button>
          </>
        ) : (
          <p>Select an entity or pocket to view details.</p>
        )}

        {clickedEntity && (
          <>
            <h3>Clicked Entity Details</h3>
            <p><strong>Entity ID:</strong> {clickedEntity}</p>
            {selectedPocketIndex !== null && (
              <p><strong>Belongs to Pocket:</strong> {selectedPocketIndex + 1}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
