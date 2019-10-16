import React from "react";

import { format, formatRelative } from 'date-fns/fp'

import { GoTag as TagIcon } from 'react-icons/go';

import Container from "react-bootstrap/Container";
import BootstrapTable from "react-bootstrap-table-next";
import { navigate } from "@reach/router"

import { useFetch } from "../hooks.js";

import "bootstrap/dist/css/bootstrap.css";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";

import { StatusDisplayBadge, sortSettings } from "./Widgets.js"

const taskCountDisplay = (cell, row) => (
    <span>{row.submitted_task_count} / {row.running_task_count} / {row.completed_task_count}</span>
);

const now = new Date();


const columns = [
        {
            dataField: "id", // primary key
            dummy: true,
            hidden: true
        },
        {
            text: "Workflow Name",
            headerStyle: { width: "30%" },
            formatter: (cell, {manifest}) => {
                return manifest
                    ? <span>{manifest.name} <span className='text-muted'><TagIcon /> {manifest.version ? manifest.version : null}</span></span>
                    : <span className='text-muted'>None</span>;
            },
            sortValue: (cell, {manifest}) => manifest ? manifest.name : "",
            ...sortSettings
        },
        {
            dataField: "nextflowRunName",
            text: "Run Name",
            headerStyle: { width: "30%" },
            ...sortSettings
        },
        {
            text: "Status",
            formatter: (cell, row) => (<StatusDisplayBadge aws_status={row.runnertaskstatus} nf_status={row.nextflowlastevent} />),
            headerStyle: { width: "20%" },
            sortValue: (cell, row) => (`${row.runnertaskstatus}-${row.nextflowlastevent}`),
            ...sortSettings
        },
        {
            dataField: "fargateCreatedAt",
            text: "Started at",
            headerStyle: { width: "20%" },
            formatter: (cell) => formatRelative(now, new Date(cell)).capFirstLetter(),
            ...sortSettings
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
                defaultSorted={[{dataField: "fargateCreatedAt", order: "desc"}]}
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
