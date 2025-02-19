import "./model.css";
import React, { useState, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";
import { detectPockets } from "../pocket/detect_pocket";
import adjacencyGraph from "../data/adjacency_graph.json";
import edgeMetadata from "../data/adjacency_graph_edge_metadata.json";
import entityInfo from "../data/entity_geometry_info.json";
import rgbToEntityMap from "../data/rgb_id_to_entity_id_map.json"; // Import the RGB to Entity ID map

import Legend from "../legend"

interface ModelEntity {
  bufferGeometry: THREE.BufferGeometry;
  entityId: string;
  color: string;
  depth?: number;  

}

// Main Model Component
export const Model = (): JSX.Element => {
  const [modelEnts, setModelEnts] = useState<ModelEntity[]>([]);
  const [pockets, setPockets] = useState<string[][]>([]);
  const [hoveredPocket, setHoveredPocket] = useState<string | null>(null);
  const [selectedPocket, setSelectedPocket] = useState<ModelEntity | null>(null);

/*
  useEffect(() => {
    try {
      if (!adjacencyGraph || !edgeMetadata || !entityInfo) return;

      // Convert entityInfo to expected format (Record<string, { centerNormal: number[] }>)
      const entityInfoMap = Object.fromEntries(
        entityInfo.map((entity) => [
          entity.entityId,
          { centerNormal: entity.centerNormal },
        ])
      );

      // Detect pockets using imported function
      const detectedPockets = detectPockets(
        adjacencyGraph,
        edgeMetadata,
        entityInfoMap
      );
      setPockets(detectedPockets);

      // Load the 3D model
      new GLTFLoader().load("./colored_glb.glb", (gltf) => {
        const newModelEntities: ModelEntity[] = [];

        gltf.scene.traverse((element) => {
          if (element.type !== "Mesh") return;

          const meshElement = element as THREE.Mesh;
          const entityId = meshElement.name.replace("Product_1_", ""); // Extract entityId

          // Assign pocket colors
          const pocketColor = detectedPockets.some((pocket) =>
            pocket.includes(entityId)
          )
            ? `hsl(${
                (detectedPockets.findIndex((pocket) =>
                  pocket.includes(entityId)
                ) *
                  40) %
                360
              }, 100%, 50%)`
            : "rgb(120, 120, 120)"; // Default color

          newModelEntities.push({
            bufferGeometry: meshElement.geometry as THREE.BufferGeometry,
            entityId,
            color: pocketColor,
            depth: entityInfoMap[entityId]?.centerNormal[2],  // Assuming Z-normal represents depth

          });
        });

        setModelEnts(newModelEntities);
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);
*/
useEffect(() => {
  try {
    if (!adjacencyGraph || !edgeMetadata || !entityInfo) return;

    // Convert entityInfo to expected format
    const entityInfoMap = Object.fromEntries(
      entityInfo.map((entity) => [
        entity.entityId,
        { centerNormal: entity.centerNormal },
      ])
    );

    // Detect pockets
    const detectedPockets = detectPockets(adjacencyGraph, edgeMetadata, entityInfoMap);
    console.log("detected pockets", detectedPockets)
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
        const entityId = rgbToEntityMap[rgbId]; // Map RGB to Entity ID

        if (!entityId) return;

        // Check if the entity belongs to a detected pocket
        const isPocket = detectedPockets.some((pocket) => pocket.includes(entityId));
        const pocketColor = isPocket ?  "#83c9ef" : `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;

        newModelEntities.push({
          bufferGeometry: meshElement.geometry,
          entityId,
          color: pocketColor,
          depth: entityInfoMap[entityId]?.centerNormal[2], // Assuming Z-normal represents depth
        });
      });

      setModelEnts(newModelEntities);
    });
  } catch (error) {
    console.error("Error loading data:", error);
  }
}, []);

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
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 0, 300] }}>
        {/*<ambientLight />
        <OrbitControls makeDefault />*/}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <OrbitControls />
        <group>
          {modelEnts.map((ent, index) => {
            const isPocket = pockets.some((pocket) =>
              pocket.includes(ent.entityId)
            );

            return (
              <mesh geometry={ent.bufferGeometry} key={index}
              onPointerOver={() => setHoveredPocket(ent.entityId)}
             onPointerOut={() => setHoveredPocket(null)}
              onClick={() => setSelectedPocket(ent)}  // Set selected pocket on click

              >
                <meshStandardMaterial
                  //color={"#c0c0c0"} // Uniform silver/gray color
                  metalness={0.5} // Semi-metallic look
                  roughness={0.3} // Slightly smooth surface
                  envMapIntensity={0.8} // Subtle reflections
                  normalScale={new THREE.Vector2(1, 1)} // Enhance depth effect
                  //color={hoveredPocket === ent.entityId ? "yellow" : ent.color}
                  color = {ent.color}
                  emissive={hoveredPocket === ent.entityId ? "yellow" : "black"}
                  //wireframe ={true}
                />
              </mesh>
            );
          })}
        </group>
      </Canvas>

<Legend pockets={pockets} entityInfoMap={entityInfoMap} />

    {/* Pocket Details (show when selected) */}
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
