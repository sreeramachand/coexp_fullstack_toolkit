import { useEffect, useRef } from "react";
import * as d3 from "d3";

const GraphVisualization = ({ edges }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!edges.length) return;

    const width = 600;
    const height = 400;
    const radius = 8;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "#f0f0f0");

    // Create zoomable group
    const container = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.5, 2]).on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

    svg.call(zoom);

    const nodes = Array.from(new Set(edges.flatMap(([source, target]) => [source, target])));
    const linkData = edges.map(([source, target, weight]) => ({ source, target, weight }));
    const nodeData = nodes.map((id) => ({ id }));

    const simulation = d3
      .forceSimulation(nodeData)
      .force("link", d3.forceLink(linkData).id((d) => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = container
      .selectAll(".link")
      .data(linkData)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 2);

    // Edge labels (weights if available)
    const edgeLabels = container
      .selectAll(".edge-label")
      .data(linkData)
      .enter()
      .append("text")
      .attr("font-size", "12px")
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      //.text((d) => (d.weight !== undefined ? d.weight : ""));
   
    const node = container
      .selectAll(".node")
      .data(nodeData)
      .enter()
      .append("circle")
      .attr("r", radius)
      .attr("fill", "steelblue");

    // Node labels
    const nodeLabels = container
      .selectAll(".node-label")
      .data(nodeData)
      .enter()
      .append("text")
      .attr("font-size", "14px")
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .attr("dy", -radius - 5)
      .text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      edgeLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      nodeLabels.attr("x", (d) => d.x).attr("y", (d) => d.y - radius - 5);
    });
  }, [edges]);

  return <svg ref={svgRef}></svg>;
};

export default GraphVisualization;
