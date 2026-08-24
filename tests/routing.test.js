import { describe, it, expect } from "vitest";
import { buildGraph, nearestNode, findPath } from "../src/routing.js";

// A small T-shaped street network:
//   A(0,0) --- B(0,1) --- C(0,2)   (one street, straight line)
//              |
//              D(1,1)             (a second street branching off B)
const streets = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 1],
    [1, 1],
  ],
];

describe("buildGraph", () => {
  it("connects consecutive points along a street", () => {
    const graph = buildGraph(streets);
    const a = graph.get("0,0");
    expect(a.edges).toHaveLength(1);
    expect(a.edges[0].key).toBe("0,1");
  });

  it("shares a node between two streets that meet at the same coordinate", () => {
    const graph = buildGraph(streets);
    const b = graph.get("0,1");
    // B connects to A, C, and D — three edges, even though B only appears
    // twice in the raw street lists (once per street).
    expect(b.edges.map((e) => e.key).sort()).toEqual(["0,0", "0,2", "1,1"]);
  });
});

describe("nearestNode", () => {
  it("finds the closest graph node to an arbitrary point", () => {
    const graph = buildGraph(streets);
    // Closer to D (1,1) than to any other node.
    expect(nearestNode(graph, 0.9, 1.0)).toBe("1,1");
  });
});

describe("findPath", () => {
  it("finds the shortest route through a shared intersection", () => {
    const graph = buildGraph(streets);
    const path = findPath(graph, "0,0", "1,1");
    // Must go A -> B -> D, through the shared intersection.
    expect(path).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ]);
  });

  it("returns a single-point path when start and end are the same node", () => {
    const graph = buildGraph(streets);
    expect(findPath(graph, "0,1", "0,1")).toEqual([[0, 1]]);
  });

  it("returns null when either endpoint isn't in the graph", () => {
    const graph = buildGraph(streets);
    expect(findPath(graph, "0,0", "99,99")).toBeNull();
  });

  it("returns null when the graph has no route between two disconnected components", () => {
    const disconnected = buildGraph([
      [
        [0, 0],
        [0, 1],
      ],
      [
        [5, 5],
        [5, 6],
      ],
    ]);
    expect(findPath(disconnected, "0,0", "5,5")).toBeNull();
  });
});
