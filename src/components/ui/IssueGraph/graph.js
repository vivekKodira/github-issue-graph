import * as d3 from "d3";

export function initializeGraph(initialGraphData) {
  

  // Set up SVG container
  const width = 1300;
  const height = 800;

  const container = d3.select("#graph-container");
  container.selectAll("*").remove(); // Clear any existing content

  if(!initialGraphData) {
    return;
  }


  const graphData = JSON.parse(JSON.stringify(initialGraphData));

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", zoomed))
    .append("g");

  // Define color scale for nodes based on group
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Initialize force simulation
  const simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3
        .forceLink()
        .id((d) => d.id)
        .distance(100)
    )
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(30));

  // Create the graph elements
  let link = svg.append("g").attr("class", "links").selectAll("line");

  let node = svg.append("g").attr("class", "nodes").selectAll("g");

  // Function to update the graph
  function updateGraph() {
    // Update links
    link = link.data(
      graphData.links,
      (d) => `${d.source.id || d.source}-${d.target.id || d.target}`
    );
    link.exit().remove();
    const linkEnter = link
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke-width", (d) => Math.sqrt(d.value) * 2);
    link = linkEnter.merge(link);

    // Update nodes
    node = node.data(graphData.nodes, (d) => d.id);
    node.exit().remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    nodeEnter
      .append("circle")
      .attr("r", 15)
      .attr("fill", (d) => color(d.group));

    nodeEnter
      .append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .text((d) => d.name);

    node = nodeEnter.merge(node);

    // Update simulation
    simulation.nodes(graphData.nodes).on("tick", ticked);

    simulation.force("link").links(graphData.links);

    simulation.alpha(1).restart();
  }

  // Tick function to update positions
  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  }

  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Zoom function
  function zoomed(event) {
    svg.attr("transform", event.transform);
  }

  // Node click handler for showing details
  svg.on("click", function (event) {
    if (event.target.tagName !== "circle") return;

    const clickedNode = d3.select(event.target).datum();
    console.log("Node clicked:", clickedNode);

    // Here you could display additional information about the node
    // or implement other interactive features
  });

  updateGraph();
}