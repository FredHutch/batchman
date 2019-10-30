import React from "react";
import {Vega} from 'react-vega';

var ChartSpec={
  "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
  "width": 800,
  "height": 400,
  "layer": [
    {
      "mark": {"type": "circle"},
      "encoding": {
        "color": {"field": "process", "type": "nominal"},
        "opacity": {"value": 0.7},
        "y": {
          "field": "process",
          "type": "ordinal",
          "title":  null
        },
        "x": {
          "field": "%cpu",
          "type": "quantitative",
          "title": "% CPU",
          "axis": {
            "grid": false,
            "tickCount": 10
          }
        },
        "tooltip": [
          {"field": "task", "type": "ordinal"},
          {"field": "%cpu", "type": "quantitative"}
        ]
      }
    }
  ],
  "config": {
    "view": {
       "stroke": "transparent"
    },
    "tick": {
      "thickness": 3,
      "bandSize": 30
    }
  }
};

export const ResourceChart = ({taskData}) => {
	if (taskData === undefined){
		return null;
	}
  const data = taskData.map((t) => ({
  	"task": t.taskLastTrace.name, // e.g., 'fastqc (1)'
  	"process": t.taskLastTrace.process, // e.g., 'fastqc'
  	// add mapping of resource metrics here
    "%cpu": t.taskLastTrace['%cpu'],
    "%mem": t.taskLastTrace['%mem']
  }))
	ChartSpec.data = {"values": data};
	return <Vega spec={ChartSpec} />
}
