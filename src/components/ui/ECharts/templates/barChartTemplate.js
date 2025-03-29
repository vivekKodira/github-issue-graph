export default {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
  },
  legend: {
    textStyle: {
      color: '#ffffff'  // Making the title white
    },
    // Position the legend at the top of the chart
    top: 0,
    // Or use 'top' for positioning relative to the chart
    // top: 'top',
    
    // Optional: horizontal alignment (default is 'center')
    left: 'center',
    
    // Optional: display as horizontal layout (default)
    orient: 'horizontal',
    
    // Optional: control spacing between legend and chart area
    padding: [0, 0, 10, 0] // [top, right, bottom, left]
  },
  xAxis: {
    type: 'category',
    data: [],
    axisLabel: {
      interval: 0, // Show all labels
      rotate: 45, // Rotate labels to avoid overlap
      // formatter: (value) => value.length > 10 ? value.slice(0, 10) + '...' : value, // Optional: Truncate long labels
  },
  },
  yAxis: {
    type: 'value'
  },
  grid: {
      left: "10%",
      right: "0%",
      top: "20%",
      bottom: "20%",
      containLabel: true
    },
  series: [
    {
      data: [],
      type: 'bar',
      label: {
          show: true,
        },
    }
  ]
};