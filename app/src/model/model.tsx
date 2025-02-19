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

// Interfaces
interface ModelEntity {
  bufferGeometry: THREE.BufferGeometry;
  entityId: string;
  color: string;
}


// Main Model Component
export const Model = (): JSX.Element => {
  const [modelEnts, setModelEnts] = useState<ModelEntity[]>([]);
  const [pockets, setPockets] = useState<string[][]>([]);

  useEffect(() => {
      try {
        if (!adjacencyGraph || !edgeMetadata || !entityInfo) return;

        // Convert entityInfo to expected format (Record<string, { centerNormal: number[] }>)
        const entityInfoMap = Object.fromEntries(
          entityInfo.map((entity) => [entity.entityId, { centerNormal: entity.centerNormal }])
        );

        // Detect pockets using imported function
        const detectedPockets =  detectPockets(adjacencyGraph, edgeMetadata, entityInfoMap);
        setPockets(detectedPockets);

        // Load the 3D model
        new GLTFLoader().load("./colored_glb.glb", (gltf) => {
          const newModelEntities: ModelEntity[] = [];

          gltf.scene.traverse((element) => {
            if (element.type !== "Mesh") return;

            const meshElement = element as THREE.Mesh;
            const entityId = meshElement.name.replace("Product_1_", ""); // Extract entityId

            // Assign pocket colors
            const pocketColor = detectedPockets.some((pocket) => pocket.includes(entityId))
              ? `hsl(${(detectedPockets.findIndex((pocket) => pocket.includes(entityId)) * 40) % 360}, 100%, 50%)`
              : "rgb(120, 120, 120)"; // Default color

            newModelEntities.push({
              bufferGeometry: meshElement.geometry as THREE.BufferGeometry,
              entityId,
              color: pocketColor,
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
        {/*<ambientLight />
        <OrbitControls makeDefault />*/}
        <ambientLight intensity={0.4} />
  <directionalLight position={[5, 10, 5]} intensity={1} />
  <OrbitControls />
        <group>
  {modelEnts.map((ent, index) => {
    const isPocket = pockets.some((pocket) => pocket.includes(ent.entityId));

    return (
      <mesh geometry={ent.bufferGeometry} key={index}>
 <meshStandardMaterial
  color={"#c0c0c0"} // Uniform silver/gray color
  metalness={0.5} // Semi-metallic look
  roughness={0.3} // Slightly smooth surface
  envMapIntensity={0.8} // Subtle reflections
  normalScale={new THREE.Vector2(1, 1)} // Enhance depth effect
/>
      </mesh>
    );
  })}
</group>
      </Canvas>
    </div>
  );
};