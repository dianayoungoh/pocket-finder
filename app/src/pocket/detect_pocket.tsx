type AdjacencyGraph = Record<string, string[]>; // Maps face ID -> connected faces
type EdgeMetadata = Record<string, number[]>; // Maps "ID1-ID2" -> [edge types]
type EntityInfo = Record<string, { centerNormal: number[] }>; // Normal vectors for depth check

// Enum for edge types
const CONCAVE = 2;

// ✅ Check if an edge is concave
const isConcaveEdge = (id1: string, id2: string, edgeMetadata: EdgeMetadata): boolean => {
  const edgeKey = `${id1}-${id2}`;
  const reverseEdgeKey = `${id2}-${id1}`;
  return (
    (edgeMetadata[edgeKey]?.includes(CONCAVE) || edgeMetadata[reverseEdgeKey]?.includes(CONCAVE)) ?? false
  );
};

// ✅ Perform BFS to detect pockets
const bfs = (
  startEntity: string,
  adjacencyGraph: AdjacencyGraph,
  edgeMetadata: EdgeMetadata,
  visited: Set<string>
): string[] => {
  const queue: string[] = [startEntity];
  const pocket: string[] = [];
  visited.add(startEntity);

  while (queue.length > 0) {
    const current = queue.shift()!;
    pocket.push(current);

    for (const neighbor of adjacencyGraph[current] || []) {
      if (!visited.has(neighbor) && isConcaveEdge(current, neighbor, edgeMetadata)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return pocket;
};

// ✅ Main function to detect pockets
const detectPockets = async (
  adjacencyGraph: AdjacencyGraph,
  edgeMetadata: EdgeMetadata,
  entityInfo: EntityInfo
): Promise<string[][]> => {
  const visited = new Set<string>();
  const pockets: string[][] = [];

  for (const entityId in adjacencyGraph) {
    if (!visited.has(entityId)) {
      const pocket = bfs(entityId, adjacencyGraph, edgeMetadata, visited);
      if (pocket.length > 1) {
        pockets.push(pocket);
      }
    }
  }

  return pockets;
};

export default detectPockets;
export { detectPockets };