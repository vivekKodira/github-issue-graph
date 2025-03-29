import * as d3 from "d3";

export function createGraph(container, initialGraphData) {
  // Set up SVG container
  const width = 1300;
  const height = 800;

  // Convert DOM element to D3 selection
  const d3Container = d3.select(container);
  d3Container.selectAll("*").remove(); // Clear any existing content

  const svg = d3Container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", zoomed))
    .append("g");

  if(!initialGraphData) {
    return;
  }

  const graphData = JSON.parse(JSON.stringify(initialGraphData));

  // Function to get node color based on type and labels
  const getNodeColor = (d) => {
    if (d.type === 'pr') {
      return d.state === 'open' ? '#2196F3' : '#607D8B';
    }

    // For issues, use the first label's color if available
    if (d.labels && d.labels.length > 0) {
      const firstLabel = d.labels[0];
      // Convert GitHub hex color (without #) to CSS color
      return `#${firstLabel.color}`;
    }

    // Default issue colors
    return d.state === 'open' ? '#4CAF50' : '#9E9E9E';
  };

  // Function to get node radius based on size
  const getNodeRadius = (d) => {
    if (d.type === 'pr') return 12;
    
    // Base radius for issues
    const baseRadius = 15;
    
    // Size mapping
    const sizeMap = {
      'VS': 1,  // Very Small
      'S': 2,   // Small
      'M': 3,   // Medium
      'C': 4,   // Complex
      'VC': 5   // Very Complex
    };
    
    const sizeValue = sizeMap[d.size] || 3; // Default to Medium if size is unknown
    return baseRadius + (sizeValue * 4);
  };

  // Function to get node stroke for open/closed status
  const getNodeStroke = (d) => {
    if (d.state === 'open') {
      return 'none';
    }
    return d.type === 'pr' ? '#607D8B' : '#9E9E9E';
  };

  // Function to get node stroke width
  const getNodeStrokeWidth = (d) => {
    return d.state === 'open' ? 0 : 3;
  };

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
      .attr("stroke-width", (d) => Math.sqrt(d.value) * 2)
      .attr("stroke", (d) => d.type === 'pr' ? '#2196F3' : '#4CAF50')
      .attr("stroke-dasharray", (d) => d.type === 'pr' ? '5,5' : null);
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
      .attr("r", getNodeRadius)
      .attr("fill", getNodeColor)
      .attr("stroke", getNodeStroke)
      .attr("stroke-width", getNodeStrokeWidth)
      .attr("stroke-dasharray", d => d.state === 'open' ? null : "3,3");

    nodeEnter
      .append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .text((d) => d.name);

    // Add tooltips to show labels and size
    nodeEnter
      .append("title")
      .text(d => {
        const labels = d.labels ? `\nLabels: ${d.labels.map(l => l.name).join(', ')}` : '';
        const size = d.size ? `\nSize: ${d.size}` : '';
        return `${d.name}${labels}${size}`;
      });

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

  // Create a map of unique labels and their colors from the data
  const labelColors = new Map();
  graphData.nodes.forEach(node => {
    if (node.labels && Array.isArray(node.labels)) {
      node.labels.forEach(label => {
        if (!labelColors.has(label.name)) {
          labelColors.set(label.name, label.color);
        }
      });
    }
  });

  // Add a legend for labels
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 150}, 20)`);

  Array.from(labelColors.entries()).forEach(([labelName, color], i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendItem.append("circle")
      .attr("r", 6)
      .attr("fill", `#${color}`);

    legendItem.append("text")
      .attr("x", 15)
      .attr("y", 4)
      .style("font-size", "12px")
      .text(labelName);
  });

  updateGraph();
}