import "./model.css";
import React, { useState, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import { detectPockets } from "../pocket/detect_pocket";
import adjacencyGraph from "../data/adjacency_graph.json";
import edgeMetadata from "../data/adjacency_graph_edge_metadata.json";
import entityInfo from "../data/entity_geometry_info.json";
import rgbToEntityMap from "../data/rgb_id_to_entity_id_map.json";

// Interfaces
interface ModelEntity {
  bufferGeometry: THREE.BufferGeometry;
  entityId: string;
  color: string;
  position: THREE.Vector3;
  depth?: number;
}

export const Model = (): JSX.Element => {
  const [modelEnts, setModelEnts] = useState<ModelEntity[]>([]);
  const [pockets, setPockets] = useState<string[][]>([]);
  const [hoveredPocket, setHoveredPocket] = useState<string | null>(null);
  const [selectedPocket, setSelectedPocket] = useState<ModelEntity | null>(null);

  useEffect(() => {
    try {
      if (!adjacencyGraph || !edgeMetadata || !entityInfo) return;

      // Convert entityInfo to expected format
      const entityInfoMap = Object.fromEntries(
        entityInfo.map((entity) => [
          entity.entityId,
          { centerNormal: entity.centerNormal, centerPoint: entity.centerPoint },
        ])
      );

      // Detect pockets
      const detectedPockets = detectPockets(adjacencyGraph, edgeMetadata, entityInfoMap);
      setPockets(detectedPockets);

      // Load the 3D model
      new GLTFLoader().load("./colored_glb.glb", (gltf) => {
        const newModelEntities: ModelEntity[] = [];

        gltf.scene.traverse((element) => {
          if (element.type !== "Mesh") return;

          const meshElement = element as THREE.Mesh;
          const material = meshElement.material as THREE.MeshStandardMaterial;

          if (!material.color) return;

          // Convert face color to RGB ID
          const color = material.color;
          const rgbId = `${Math.round(color.r * 255)}-${Math.round(color.g * 255)}-${Math.round(color.b * 255)}`;
          const entityId = rgbToEntityMap[rgbId];

          if (!entityId) return;

          const entityData = entityInfoMap[entityId];
          const position = entityData?.centerPoint
            ? new THREE.Vector3(...entityData.centerPoint)
            : new THREE.Vector3(0, 0, 0);

          // Check if entity belongs to a pocket
          const pocketIndex = detectedPockets.findIndex((pocket) => pocket.includes(entityId));
          const isPocket = pocketIndex !== -1;
          const pocketColor = isPocket ? `hsl(${(pocketIndex * 40) % 360}, 100%, 50%)` : "#c0c0c0";

          newModelEntities.push({
            bufferGeometry: meshElement.geometry,
            entityId,
            color: pocketColor,
            position,
            depth: entityData?.centerNormal?.[2],
          });
        });

        setModelEnts(newModelEntities);
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 0, 300] }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <OrbitControls />

        <group>
          {modelEnts.map((ent, index) => {
            const pocketIndex = pockets.findIndex((pocket) =>
              pocket.includes(ent.entityId)
            );

            return (
              <mesh
                key={index}
                geometry={ent.bufferGeometry}
                onPointerOver={() => setHoveredPocket(ent.entityId)}
                onPointerOut={() => setHoveredPocket(null)}
                onClick={() => setSelectedPocket(ent)}
              >
                <meshStandardMaterial
                  color={hoveredPocket === ent.entityId ? "yellow" : ent.color}
                  metalness={0.7}
                  roughness={0.2}
                  emissive={hoveredPocket === ent.entityId ? "yellow" : "black"}
                />

                {/* Pocket Labels */}
                {pocketIndex !== -1 && (
                  <Text
                    position={ent.position}
                    fontSize={5}
                    color="black"
                    anchorX="center"
                    anchorY="middle"
                  >
                    Pocket {pocketIndex + 1}
                  </Text>
                )}
              </mesh>
            );
          })}
        </group>
      </Canvas>

      {/* Pocket Info Panel */}
      {selectedPocket && (
        <div className="pocket-info">
          <h3>Pocket Details</h3>
          <p><strong>Entity ID:</strong> {selectedPocket.entityId}</p>
          <p><strong>Depth:</strong> {selectedPocket.depth?.toFixed(2) ?? "N/A"}</p>
          <p><strong>Color:</strong> {selectedPocket.color}</p>
          <button onClick={() => setSelectedPocket(null)}>Close</button>
        </div>
      )}
    </div>
  );
};
