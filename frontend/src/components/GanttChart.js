import React from "react";
import {Vega} from 'react-vega';

var GanttSpec={
  "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
  "width": 800,
  "height": 400,
  "layer": [
    {
      "mark": {"type": "bar"},
      "encoding": {
      	"color": {"field": "process", "type": "nominal"},
      	"opacity": {"value": 0.7},
        "y": {
          "field": "task",
          "type": "ordinal",
          "title":  null,
          "axis": {"domainWidth": 0}
        },
        "x": {
          "field": "submit",
          "type": "quantitative",
          "title": "Elapsed Time (minutes)",
          "axis": {"grid": false}
        },
        "x2": {"field": "start"}
      }
    },
    {
      "mark": {"type": "bar"},
      "encoding": {
      	"color": {"field": "process", "type": "nominal"},
        "y": {
          "field": "task",
          "type": "ordinal",
          "axis": null
        },
        "x": {
          "field": "start",
          "type": "quantitative",
          "axis": null
        },
        "x2": {"field": "complete"}
      }
    }
  ],
  "config": {
	  "view": {
	     "stroke": "transparent"
	  }
  }
};

const msToMin = (ms) => (ms / 1000 / 60)

export const GanttChart = ({taskData, workflowStart}) => {
	if (taskData === undefined){
		return null;
	}
    const data = taskData.map((t) => ({
    	"task": t.taskLastTrace.name,
    	"process": t.taskLastTrace.process,
    	"submit": msToMin(t.taskLastTrace.submit - workflowStart),
    	"start": msToMin(t.taskLastTrace.start - workflowStart),
    	"complete": msToMin(t.taskLastTrace.complete - workflowStart)
    }))
	GanttSpec.data = {"values": data};
	return <Vega spec={GanttSpec} />
}