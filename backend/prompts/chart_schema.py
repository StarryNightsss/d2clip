"""
ECharts 图表配置 Schema
供大模型参考，生成符合规范的图表配置
"""

ECHARTS_PIE_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 饼图配置",
  "properties": {
    "tooltip": {
      "type": "object",
      "properties": {
        "trigger": {"type": "string", "enum": ["item", "axis"]},
        "formatter": {"type": "string"}
      }
    },
    "legend": {
      "type": "object",
      "properties": {
        "orient": {"type": "string", "enum": ["horizontal", "vertical"]},
        "left": {"type": ["string", "number"]},
        "right": {"type": ["string", "number"]},
        "top": {"type": ["string", "number"]}
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "const": "pie"},
          "radius": {"type": ["string", "array"]},
          "center": {"type": "array"},
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "value": {"type": "number"}
              }
            }
          },
          "label": {"type": "object"},
          "itemStyle": {"type": "object"}
        }
      }
    },
    "color": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
"""

ECHARTS_BAR_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 柱状图配置",
  "properties": {
    "tooltip": {"type": "object"},
    "grid": {
      "type": "object",
      "properties": {
        "left": {"type": "string"},
        "right": {"type": "string"},
        "bottom": {"type": "string"},
        "containLabel": {"type": "boolean"}
      }
    },
    "xAxis": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "enum": ["value", "category"]},
        "data": {"type": "array"},
        "axisLabel": {"type": "object"},
        "axisLine": {"type": "object"}
      }
    },
    "yAxis": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "enum": ["value", "category"]},
        "data": {"type": "array"}
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "const": "bar"},
          "data": {"type": "array"},
          "barWidth": {"type": "string"},
          "itemStyle": {"type": "object"},
          "label": {"type": "object"}
        }
      }
    },
    "color": {"type": "array"}
  }
}
"""

ECHARTS_SCATTER_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 散点图配置（用于词云）",
  "properties": {
    "tooltip": {"type": "object"},
    "grid": {"type": "object"},
    "xAxis": {
      "type": "object",
      "properties": {
        "show": {"type": "boolean"},
        "type": {"type": "string"},
        "min": {"type": "number"},
        "max": {"type": "number"}
      }
    },
    "yAxis": {
      "type": "object",
      "properties": {
        "show": {"type": "boolean"},
        "type": {"type": "string"},
        "min": {"type": "number"},
        "max": {"type": "number"}
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {"type": "string", "const": "scatter"},
          "symbolSize": {"type": "number"},
          "data": {
            "type": "array",
            "description": "每项格式：[x, y, size, label]",
            "items": {"type": "array"}
          },
          "label": {"type": "object"},
          "itemStyle": {"type": "object"}
        }
      }
    },
    "color": {"type": "array"}
  }
}
"""

ECHARTS_RADAR_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 雷达图配置（多维度对比分析）",
  "properties": {
    "tooltip": {"type": "object"},
    "legend": {
      "type": "object",
      "properties": {
        "data": {"type": "array"},
        "top": {"type": "string"},
        "left": {"type": "string"}
      }
    },
    "radar": {
      "type": "object",
      "properties": {
        "indicator": {
          "type": "array",
          "description": "雷达图维度配置",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string", "description": "维度名称"},
              "max": {"type": "number", "description": "最大值"}
            }
          }
        },
        "radius": {"type": ["string", "number"]},
        "center": {"type": "array"},
        "splitNumber": {"type": "number"},
        "name": {"type": "object"},
        "splitArea": {"type": "object"},
        "splitLine": {"type": "object"}
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "const": "radar"},
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "value": {"type": "array", "description": "各维度数值数组"}
              }
            }
          },
          "areaStyle": {"type": "object"},
          "lineStyle": {"type": "object"}
        }
      }
    },
    "color": {"type": "array"}
  }
}
"""

ECHARTS_HEATMAP_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 热力图配置（交叉分析）",
  "properties": {
    "tooltip": {
      "type": "object",
      "properties": {
        "position": {"type": "string"},
        "formatter": {"type": "string"}
      }
    },
    "grid": {
      "type": "object",
      "properties": {
        "height": {"type": "string"},
        "top": {"type": "string"},
        "containLabel": {"type": "boolean"}
      }
    },
    "xAxis": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "const": "category"},
        "data": {"type": "array", "description": "X轴类目"},
        "splitArea": {"type": "object"},
        "axisLabel": {"type": "object"}
      }
    },
    "yAxis": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "const": "category"},
        "data": {"type": "array", "description": "Y轴类目"},
        "splitArea": {"type": "object"}
      }
    },
    "visualMap": {
      "type": "object",
      "properties": {
        "min": {"type": "number"},
        "max": {"type": "number"},
        "calculable": {"type": "boolean"},
        "orient": {"type": "string"},
        "left": {"type": "string"},
        "bottom": {"type": "string"},
        "inRange": {
          "type": "object",
          "properties": {
            "color": {"type": "array", "description": "渐变色数组"}
          }
        }
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "const": "heatmap"},
          "data": {
            "type": "array",
            "description": "数据格式：[[xIndex, yIndex, value], ...]",
            "items": {"type": "array"}
          },
          "label": {"type": "object"},
          "emphasis": {"type": "object"}
        }
      }
    }
  }
}
"""

ECHARTS_SANKEY_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 桑基图配置（流转关系）",
  "properties": {
    "tooltip": {
      "type": "object",
      "properties": {
        "trigger": {"type": "string", "const": "item"},
        "triggerOn": {"type": "string"}
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {"type": "string", "const": "sankey"},
          "layout": {"type": "string", "enum": ["none", "circular"]},
          "emphasis": {"type": "object"},
          "data": {
            "type": "array",
            "description": "节点数据",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "itemStyle": {"type": "object"}
              }
            }
          },
          "links": {
            "type": "array",
            "description": "连接关系",
            "items": {
              "type": "object",
              "properties": {
                "source": {"type": "string"},
                "target": {"type": "string"},
                "value": {"type": "number"}
              }
            }
          },
          "lineStyle": {"type": "object"},
          "label": {"type": "object"}
        }
      }
    },
    "color": {"type": "array"}
  }
}
"""

ECHARTS_GAUGE_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 仪表盘配置（单指标展示）",
  "properties": {
    "tooltip": {"type": "object"},
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {"type": "string", "const": "gauge"},
          "center": {"type": "array"},
          "radius": {"type": "string"},
          "startAngle": {"type": "number"},
          "endAngle": {"type": "number"},
          "min": {"type": "number"},
          "max": {"type": "number"},
          "splitNumber": {"type": "number"},
          "axisLine": {
            "type": "object",
            "properties": {
              "lineStyle": {
                "type": "object",
                "properties": {
                  "width": {"type": "number"},
                  "color": {
                    "type": "array",
                    "description": "分段颜色 [[threshold, color], ...]"
                  }
                }
              }
            }
          },
          "pointer": {"type": "object"},
          "axisTick": {"type": "object"},
          "splitLine": {"type": "object"},
          "axisLabel": {"type": "object"},
          "detail": {
            "type": "object",
            "properties": {
              "formatter": {"type": "string"},
              "fontSize": {"type": "number"}
            }
          },
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "value": {"type": "number"},
                "name": {"type": "string"}
              }
            }
          }
        }
      }
    }
  }
}
"""

ECHARTS_FUNNEL_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 漏斗图配置（层级递减）",
  "properties": {
    "tooltip": {
      "type": "object",
      "properties": {
        "trigger": {"type": "string", "const": "item"},
        "formatter": {"type": "string"}
      }
    },
    "legend": {"type": "object"},
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "const": "funnel"},
          "left": {"type": "string"},
          "top": {"type": "string"},
          "bottom": {"type": "string"},
          "width": {"type": "string"},
          "min": {"type": "number"},
          "max": {"type": "number"},
          "minSize": {"type": "string"},
          "maxSize": {"type": "string"},
          "sort": {"type": "string", "enum": ["ascending", "descending", "none"]},
          "gap": {"type": "number"},
          "label": {"type": "object"},
          "labelLine": {"type": "object"},
          "itemStyle": {"type": "object"},
          "emphasis": {"type": "object"},
          "data": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "value": {"type": "number"}
              }
            }
          }
        }
      }
    },
    "color": {"type": "array"}
  }
}
"""

ECHARTS_LINE_SCHEMA = """
{
  "type": "object",
  "description": "ECharts 折线图配置（趋势分析）",
  "properties": {
    "tooltip": {
      "type": "object",
      "properties": {
        "trigger": {"type": "string", "enum": ["axis", "item"]},
        "axisPointer": {"type": "object"}
      }
    },
    "legend": {"type": "object"},
    "grid": {"type": "object"},
    "xAxis": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "enum": ["category", "value", "time"]},
        "data": {"type": "array"},
        "boundaryGap": {"type": "boolean"}
      }
    },
    "yAxis": {
      "type": "object",
      "properties": {
        "type": {"type": "string", "const": "value"}
      }
    },
    "series": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "type": {"type": "string", "const": "line"},
          "data": {"type": "array"},
          "smooth": {"type": "boolean"},
          "areaStyle": {"type": "object", "description": "填充面积样式（面积图）"},
          "lineStyle": {"type": "object"},
          "itemStyle": {"type": "object"},
          "emphasis": {"type": "object"},
          "markPoint": {"type": "object"},
          "markLine": {"type": "object"}
        }
      }
    },
    "color": {"type": "array"}
  }
}
"""

# 配色方案
COLOR_SCHEMES = {
    "default": ['#ff6b9d', '#5f27cd', '#00d2d3', '#feca57', '#ee5a6f', '#48dbfb', '#ff9ff3', '#54a0ff'],
    "warm": ['#ff6b6b', '#ee5a6f', '#feca57', '#ff9ff3', '#fdcb6e', '#e17055'],
    "cool": ['#00d2d3', '#48dbfb', '#5f27cd', '#54a0ff', '#0abde3', '#341f97'],
    "professional": ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#74b9ff', '#a29bfe'],
    "gradient_pink": ['#ff9a9e', '#fad0c4', '#fbc2eb', '#a18cd1'],
    "gradient_blue": ['#667eea', '#764ba2', '#f093fb', '#4facfe']
}
