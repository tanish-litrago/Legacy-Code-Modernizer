import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function CallGraph({ graphJson }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!graphJson || !svgRef.current) return;

    let parsed;
    try {
      parsed = JSON.parse(graphJson);
    } catch {
      return;
    }

    const nodes = (parsed.nodes || []).map((n) => ({ id: n.id || n, ...n }));
    const links = (parsed.links || parsed.edges || []).map((l) => ({
      source: l.source,
      target: l.target,
    }));

    const el = svgRef.current;
    const { width, height } = el.getBoundingClientRect();
    const W = width || 560;
    const H = height || 360;

    d3.select(el).selectAll("*").remove();

    const svg = d3
      .select(el)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", W)
      .attr("height", H)
      .style("background", "var(--surface)")
      .style("border-radius", "12px");

    // Zoom container
    const g = svg.append("g");
    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on("zoom", (e) => g.attr("transform", e.transform))
    );

    // Arrow marker — uses --graph-edge for high visibility in both light & dark mode
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "var(--graph-edge)");

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-240))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(45));

    // Visible, prominent edges in both light and dark mode
    const link = g
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "var(--graph-edge)")
      .attr("stroke-opacity", 0.95)
      .attr("stroke-width", 2.2)
      .attr("marker-end", "url(#arrow)");

    const node = g
      .selectAll("g.node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append("circle")
      .attr("r", 25)
      .attr("fill", "var(--elevated)")
      .attr("stroke", "var(--graph-edge)")
      .attr("stroke-width", 2.5);

    node.append("text")
      .text((d) => d.id.length > 10 ? d.id.slice(0, 9) + "…" : d.id)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "var(--fg)")
      .attr("font-size", 11)
      .attr("font-weight", "600")
      .attr("font-family", "JetBrains Mono, monospace");

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("background", "var(--surface)")
      .style("border", "1px solid var(--border)")
      .style("border-radius", "8px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("font-family", "JetBrains Mono, monospace")
      .style("color", "var(--fg)")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
      .style("opacity", 0)
      .style("transition", "opacity 0.15s")
      .style("z-index", "100");

    node
      .on("mouseenter", (e, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.id}</strong><br/>lang: ${d.language || "—"}<br/>line: ${d.start_line ?? "—"}`);
      })
      .on("mousemove", (e) => {
        tooltip.style("left", e.clientX + 14 + "px").style("top", e.clientY - 28 + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [graphJson]);

  return (
    <svg
      ref={svgRef}
      className="w-full"
      style={{ height: 360, borderRadius: 12, border: "1px solid var(--border)" }}
    />
  );
}
