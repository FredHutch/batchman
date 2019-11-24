import React, { useState, useContext } from "react";

import { format, formatRelative } from 'date-fns/fp'
import { GoTag as TagIcon, GoSync } from 'react-icons/go';

import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import BootstrapTable from "react-bootstrap-table-next";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";

import { navigate } from "@reach/router"
import { useFetch } from "../hooks.js";

import { ProfileContext } from "../App.js";

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
            dataField: "username",
            text: "User",
            headerStyle: { width: "10%" },
            ...sortSettings
        },
        {
            dataField: "workgroup",
            text: "Workgroup",
            headerStyle: { width: "10%" },
            ...sortSettings
        },
        {
            text: "Workflow Name",
            headerStyle: { width: "30%" },
            formatter: (cell, {manifest}) => {
                return manifest && manifest.name
                    ? <span>{manifest.name} {manifest.version && <span className='text-muted'><TagIcon /> {manifest.version}</span>}</span>
                    : <span className='text-muted'>None</span>;
            },
            sortValue: (cell, {manifest}) => manifest ? manifest.name : "",
            ...sortSettings
        },
        {
            dataField: "nextflowRunName",
            text: "Run Name",
            headerStyle: { width: "30%" },
            formatter: (cell, row) => (<span>{cell} {row.cacheTaskArn && <GoSync style={{color: "blue"}}/>}</span>),
            sortValue: (cell) => cell,
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
            sortValue: (cell, row) => new Date(cell),
            ...sortSettings
        },
        {
            dataField: "taskCounts",
            text: <span>Task Counts</span>,
            formatter: taskCountDisplay,
            headerStyle: { width: "15%" }
        }
    ];

function WorkflowListView(props) {
    document.title = "All Workflows"
    const [activeTabKey, setActiveTabKey ] = useState('username=me');
    const [data, isLoading, isError] = useFetch("/api/v1/workflow?" + activeTabKey);
    const profile = useContext(ProfileContext)

    if (isLoading) {
        return <div>Loading</div>
    } else if (isError) {
        return <div>Error</div>
    }

    return (
        <Container fluid>
        <h2>Workflow Executions</h2>
            <br/>
            <Tabs activeKey={activeTabKey} onSelect={setActiveTabKey} id="workflow-list-tabs" transition={false} >
              <Tab eventKey="username=me" title="My Workflows" />
              {profile.workgroups.map(w => <Tab eventKey={"workgroup=" + w.name} title={w.display_name} />)}
              <Tab eventKey="status=error" title="Errors" />
            </Tabs>

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
