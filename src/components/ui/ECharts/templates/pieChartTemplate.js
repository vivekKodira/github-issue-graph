export default {
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)',
  },
  title: {
    left: 'center',
    top: 5,
    textStyle: {
      color: '#ffffff'
    }
  },
  series: [{
    type: 'pie',
    radius: '60%',
    center: ['50%', '35%'],
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }]
}; 