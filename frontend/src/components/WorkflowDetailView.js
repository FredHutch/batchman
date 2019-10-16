import React, { useState } from "react";

import { format, formatRelative } from 'date-fns/fp'

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import BootstrapTable from "react-bootstrap-table-next";

import { GoTag as TagIcon } from 'react-icons/go';


import { useFetch } from "../hooks.js";

import {PrettyPrintJson, LabeledValue, LabeledValueList, StatusDisplayBadge, S3Link} from "./Widgets.js"

import {GanttChart} from "./GanttChart.js"

import TaskDetailModal from "./TaskDetailModal.js"
import NextflowLogModal from "./NextflowLogModal.js"

import "bootstrap/dist/css/bootstrap.css";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";

const timeConversion = (millisec) => {
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
    return row.taskLastTrace.realtime
        ? timeConversion(row.taskLastTrace.realtime)
        : timeConversion(new Date() - row.taskLastTrace.submit)
}


const TaskTable = ({ data, handleClick }) => {
    const statusClasses = {
        "COMPLETED": "text-success",
        "RUNNING": "text-info",
        "FAILED": "text-danger"
    }

    const columns = [
        {
            dataField: "id", // primary key
            dummy: true,
            hidden: true
        },
        {
            dataField: "taskId",
            text: "Task ID",
            headerStyle: { width: "5%" }
        },
        {
            dataField: "taskName",
            text: "Process",
            headerStyle: { width: "10%" }
        },
        {
            dataField: "taskLastTrace.container",
            text: "Container",
            headerStyle: { width: "25%" }
        },
        {
            dataField: "taskLastTrace.status",
            text: "Last Status",
            headerStyle: { width: "10%" },
            formatter: (cell) => (<span className={statusClasses[cell]}>{cell}</span>)
        },
        {
            text: "Run Time",
            headerStyle: { width: "5%" },
            formatter: runtimeDisplay
        },
        {
            dataField: "taskLastTrace.attempt",
            text: "Attempt",
            headerStyle: { width: "5%" }
        }
    ];
    return <BootstrapTable
                keyField="id"
                data={data}
                columns={columns}
                rowEvents={{
                    onClick: (e, row, rowIndex) => handleClick(row)
                }}
                rowStyle={{cursor: "pointer"}}
                hover={true}
                bootstrap4={true}
                bordered={false}
                condensed
                noDataIndication="No tasks to list"
            />
}

function WorkflowDetailView({ runArn }) {
    document.title = "Workflow Detail"
    const [runData, runDataIsLoading, runDataisError] = useFetch(`/api/v1/workflow/${runArn}`);
    const [taskData, taskDataIsLoading, taskDataisError] = useFetch(`/api/v1/workflow/${runArn}/tasks`);
    const [taskModalData, setTaskModalData] = useState(false);
    const [nextflowModalData, setNextflowModalData] = useState(false);

    if (runDataIsLoading || taskDataIsLoading) {
        return <div>Loading</div>
    }

    if (runData.nextflowMetadata == null) {
        runData.nextflowMetadata = {workflow: {manifest: {}}};
        runData.info = {};
    }
    
    const runTime = runData.nextflowWorkflowEndDateTime
            ? timeConversion(Date.parse(runData.nextflowWorkflowEndDateTime) - Date.parse(runData.fargateCreatedAt))
            : timeConversion(new Date() - Date.parse(runData.fargateCreatedAt))

    const NA_STRING = "Not yet available";
    const now = new Date();
    const manifest = runData.nextflowMetadata.workflow.manifest
    return (
        <Container fluid style={{minHeight:1800}}>
        <h2>{manifest.name || "Workflow Detail"} <span style={{fontSize: 20, paddingLeft: 12}} className="text-muted">{manifest.version ? <span><TagIcon /> manifest.version</span> : null}</span></h2>
        

        <Row>
        <Col md='7' sm="12">
            <div className="workflow-detail-well" >
                <Row>
                    <Col md="4" sm="12">
                        <LabeledValue label="Run Name" value={
                            <span>
                                <b>{runData.nextflowMetadata.workflow.runName || NA_STRING}</b><br/>
                                <span style={{color: "#aaa", fontSize: "10pt"}}>ARN: {runData.fargateTaskArn}</span>
                            </span>
                        } />
                    </Col>
                    <Col md="5" sm="12">
                        <LabeledValue label="Started at" value={formatRelative(now, new Date(runData.fargateCreatedAt)).capFirstLetter()} inline />
                        {runData.nextflowWorkflowEndDateTime ? <LabeledValue label="Finished at" value={formatRelative(now, new Date(runData.nextflowWorkflowEndDateTime)).capFirstLetter()} inline /> : null}
                        <LabeledValue label="Runtime" value={runTime} inline />
                    </Col>
                    <Col md="3" sm="12" style={{textAlign: "right"}}>
                        <h3 style={{marginTop: 4, marginRight: 10}}><StatusDisplayBadge aws_status={runData.fargateLastStatus} nf_status={runData.nextflowLastEvent} /></h3>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <LabeledValue label="Nextflow Command" value={runData.nextflowMetadata.workflow.commandLine || NA_STRING} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <LabeledValue label="Work Directory" value={runData.nextflowMetadata.workflow.workDir || NA_STRING} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                    { runData.nextflowMetadata.parameters
                        ? <LabeledValueList label="Workflow Parameters" values={ runData.nextflowMetadata.parameters } />
                        : <LabeledValue label="Workflow Parameters" value={NA_STRING} />
                    }
                    </Col>
                </Row>
            </div>
        </Col>
        <Col md="2">
            <Button variant="outline-primary" style={{width: "100%"}} onClick={() => setNextflowModalData({workflowTaskArn: runData.fargateTaskArn})} >
                View Nextflow Logs
            </Button>
            <Button variant="outline-primary mt-3" style={{width: "100%"}} disabled>
                View Script and Config Files
            </Button>
        </Col>
        </Row>
        { runData.nextflowMetadata.workflow.errorReport
            ? (
                <Row><Col md='7' sm="12"><Alert variant="danger">
                    <LabeledValue label="Exit Code" value={<pre>{runData.nextflowMetadata.workflow.exitStatus}</pre>} />
                    <LabeledValue label="Error" value={<pre>{runData.nextflowMetadata.workflow.errorReport}</pre>} />
                </Alert></Col></Row>
            ) : null
        }
        <Row>
            <Col md="9">
                <Tabs defaultActiveKey="list" id="tasks-detail-tabs" transition={false} >
                  <Tab eventKey="list" title="Task List">
                    <TaskTable data={taskData} handleClick={setTaskModalData}/>
                  </Tab>
                  <Tab eventKey="timeline" title="Timeline View">
                    <GanttChart taskData={taskData} workflowStart={Date.parse(runData.nextflowMetadata.workflow.start || NA_STRING)}/>
                  </Tab>
                  <Tab eventKey="raw" title="Raw">
                    <PrettyPrintJson data={taskData} />
                  </Tab>
                </Tabs>
            </Col>
        </Row>
        <TaskDetailModal 
            data={taskModalData}
            showHandler={setTaskModalData}
        />
        <NextflowLogModal
            data={nextflowModalData}
            showHandler={setNextflowModalData}
        />
        </Container>
    )    
}

export default WorkflowDetailView;
