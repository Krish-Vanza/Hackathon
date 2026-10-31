import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Async, Card, PageHeader } from "../components/layout/ui.jsx";
import { useApi } from "../hooks/useApi.js";

const SKILL_COLOR = "#0f766e";
const ROLE_COLOR = "#b45309";
const EDGE_LABELS = { prerequisite_of: "Prerequisite of", related_to: "Related to", required_by: "Required by" };

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const NODE_REL_SIZE = 4;
const nodeVal = (node) => 1 + node.centrality * 6;
const nodeRadius = (node) => Math.sqrt(nodeVal(node)) * NODE_REL_SIZE;

function GraphCanvas({ data, onSelect }) {
  const [ref, width] = useElementWidth();
  const graphRef = useRef(null);

  // Spread nodes out so labels stay readable. distanceMax stops unconnected nodes drifting away,
  // which would make zoom-to-fit shrink everything else. The ref is set once the canvas mounts.
  useEffect(() => {
    graphRef.current?.d3Force("charge")?.strength(-260).distanceMax(170);
    graphRef.current?.d3Force("link")?.distance(75);
    graphRef.current?.d3ReheatSimulation();
  }, [width > 0, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // The library replaces link endpoints with node objects, so give it its own copy.
  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.edges.map((edge) => ({ ...edge })),
    }),
    [data],
  );

  return (
    <div ref={ref} className="h-[520px] overflow-hidden rounded-lg bg-slate-50">
      {width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={width}
          height={520}
          cooldownTicks={120}
          onEngineStop={() => graphRef.current?.zoomToFit(300, 40)}
          nodeLabel="label"
          nodeRelSize={NODE_REL_SIZE}
          nodeVal={nodeVal}
          nodeColor={(node) => (node.type === "role" ? ROLE_COLOR : SKILL_COLOR)}
          linkColor={() => "#cbd5e1"}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => onSelect(node.id)}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node, context, scale) => {
            context.font = `${11 / scale}px sans-serif`;
            context.fillStyle = "#334155";
            context.textAlign = "center";
            context.textBaseline = "top";
            context.fillText(node.label, node.x, node.y + nodeRadius(node) + 3 / scale);
          }}
        />
      )}
    </div>
  );
}

function SidePanel({ data, selectedId, focus, onFocus }) {
  const node = data.nodes.find((item) => item.id === selectedId);
  if (!node) return <p className="text-sm text-slate-500">Select a node to see its connections.</p>;

  const labelOf = (id) => data.nodes.find((item) => item.id === id)?.label ?? id;
  const connections = data.edges.filter((edge) => edge.source === node.id || edge.target === node.id);

  return (
    <div className="text-sm">
      <p className="font-semibold">{node.label}</p>
      <p className="text-slate-500">
        {node.category} · centrality {node.centrality.toFixed(2)}
      </p>
      <ul className="mt-3 space-y-1">
        {connections.map((edge) => {
          const outgoing = edge.source === node.id;
          return (
            <li key={`${edge.source}-${edge.target}-${edge.type}`} className="text-slate-700">
              <span className="text-slate-500">
                {EDGE_LABELS[edge.type] ?? edge.type}
                {outgoing ? "" : " (from)"}:
              </span>{" "}
              {labelOf(outgoing ? edge.target : edge.source)}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => onFocus(focus === node.id ? null : node.id)} className="font-medium text-teal-700 underline">
          {focus === node.id ? "Show full graph" : "Focus on this node"}
        </button>
        {node.type === "skill" && (
          <Link to={`/forecast/${node.id}`} className="font-medium text-teal-700 underline">
            View forecast
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Graph() {
  const [focus, setFocus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const graph = useApi(() => api.graph(focus), [focus]);

  return (
    <>
      <PageHeader title="Skills Knowledge Graph" subtitle="Larger nodes are more central. Teal nodes are skills and amber nodes are roles." />
      <Async state={graph} isEmpty={(data) => data.nodes.length === 0} emptyText="The graph has no nodes yet.">
        {(data) => (
          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <Card>
              <GraphCanvas data={data} onSelect={setSelectedId} />
            </Card>
            <Card title="Details">
              <SidePanel data={data} selectedId={selectedId} focus={focus} onFocus={setFocus} />
            </Card>
          </div>
        )}
      </Async>
    </>
  );
}
