import React from "react";

import Container from "react-bootstrap/Container";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import BootstrapTable from "react-bootstrap-table-next";
import { navigate } from "@reach/router"

import { useFetch } from "../hooks.js";

import "bootstrap/dist/css/bootstrap.css";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";

const PrettyPrintJson = ({data}) => (
    <div><pre>
        { JSON.stringify(data || {}, null, 2) }
    </pre></div>
);


function timeConversion(millisec) {
        var seconds = (millisec / 1000).toFixed(1);
        var minutes = (millisec / (1000 * 60)).toFixed(1);
        var hours = (millisec / (1000 * 60 * 60)).toFixed(1);
        var days = (millisec / (1000 * 60 * 60 * 24)).toFixed(1);

        if (seconds < 60) {
            return seconds + " Sec";
        } else if (minutes < 60) {
            return minutes + " Min";
        } else if (hours < 24) {
            return hours + " Hrs";
        } else {
            return days + " Days"
        }
    }
const runtimeDisplay = (cell, row) => {
    return row.trace.realtime
        ? timeConversion(row.trace.realtime)
        : timeConversion(new Date() - row.trace.submit)
}

const TaskTable = ({ data }) => {
    const columns = [
        {
            dataField: "id", // primary key
            dummy: true,
            hidden: true
        },
        {
            dataField: "task_id",
            text: "Task ID",
            headerStyle: { width: "10%" }
        },
        {
            dataField: "trace.hash",
            text: "Nextflow hash",
            headerStyle: { width: "10%" }
        },
        {
            dataField: "trace.process",
            text: "Process",
            headerStyle: { width: "10%" }
        },
        {
            dataField: "trace.container",
            text: "Container",
            headerStyle: { width: "20%" }
        },
        {
            dataField: "trace.status",
            text: "Status",
            headerStyle: { width: "20%" }
        },
        {
            text: "Run Time",
            headerStyle: { width: "20%" },
            formatter: runtimeDisplay
        },
        {
            dataField: "trace.attempt",
            text: "Attempt",
            headerStyle: { width: "20%" }
        }
    ];
    return <BootstrapTable
                keyField="id"
                data={data}
                columns={columns}
                bootstrap4={true}
                bordered={false}
                condensed
                noDataIndication="No tasks to list"
            />
}

function WorkflowDetailView({ runArn }) {
    document.title = `Workflow Detail - ${runArn}`
    const [runData, runDataIsLoading, runDataisError] = useFetch(`/api/v1/workflow/${runArn}`);
    const [taskData, taskDataIsLoading, taskDataisError] = useFetch(`/api/v1/workflow/${runArn}/tasks`);    
    return (
        <Container fluid style={{minHeight:1800}}>
        <h2>Workflow Detail - {runArn}</h2>
            <PrettyPrintJson data={runData} />
        <h3>Tasks</h3>
        <Tabs defaultActiveKey="list" id="tasks-detail-tabs" transition={false} >
          <Tab eventKey="list" title="List">
            <TaskTable data={taskData} />
          </Tab>
          <Tab eventKey="gannt" title="Gannt View">
            <span>TODO: Gannt Chart</span>
          </Tab>
          <Tab eventKey="raw" title="Raw">
            <PrettyPrintJson data={taskData} />
          </Tab>
        </Tabs>
        </Container>
    )    
}

export default WorkflowDetailView;
