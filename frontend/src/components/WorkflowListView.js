import React from "react";

import Container from "react-bootstrap/Container";
import BootstrapTable from "react-bootstrap-table-next";
import { navigate } from "@reach/router"

import { useFetch } from "../hooks.js";

import "bootstrap/dist/css/bootstrap.css";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";

const taskCountDisplay = (cell, row) => (
    <span>{row.submitted_task_count} / {row.running_task_count} / {row.completed_task_count}</span>
);

const columns = [
        {
            dataField: "id", // primary key
            dummy: true,
            hidden: true
        },
        {
            dataField: "nextflowRunName",
            text: "Run Name",
            headerStyle: { width: "40%" }
        },
        {
            dataField: "runnertaskstatus",
            text: "Status",
            headerStyle: { width: "20%" }
        },
        {
            dataField: "fargateCreatedAt",
            text: "Started at",
            headerStyle: { width: "20%" }
        },
        {
            dataField: "taskCounts",
            text: <span>Task Counts <br/>(Submitted/Running/Completed)</span>,
            formatter: taskCountDisplay,
            headerStyle: { width: "35%" }
        },
        {
            dataField: "miniToolbar",
            text: "Actions",
            headerStyle: { width: "20%" }
        }
    ];

function WorkflowListView(props) {
    document.title = "All Workflows"
    const [data, isLoading, isError] = useFetch("/api/v1/workflow");

    if (isLoading) {
        return <div>Loading</div>
    } else if (isError) {
        return <div>Error</div>
    }

    return (
        <Container fluid>
        <h2>Workflow Executions</h2>
            <BootstrapTable
                keyField="id"
                data={data}
                columns={columns}
                rowStyle={{cursor: "pointer"}}
                rowEvents={{
                    onClick: (e, row, rowIndex) => navigate(`/workflows/${row.fargateTaskArn}`)
                }}
                bootstrap4={true}
                bordered={false}
                hover={true}
                condensed
                noDataIndication="No workflows to list"
            />
        </Container>
    )    
}

export default WorkflowListView;
