import React, { useState, useEffect } from "react";
import { useQuery } from 'react-fetching-library';
import { useLocalStorage, useInterval } from '../hooks.js';

import { Link, navigate } from '@reach/router'

import { format, formatRelative } from 'date-fns/fp'

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup'
import ToggleButton from 'react-bootstrap/ToggleButton'

import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import BootstrapTable from "react-bootstrap-table-next";

import Modal from "react-bootstrap/Modal";

import { GoTag as TagIcon, GoSync, GoStop } from 'react-icons/go';

import {PrettyPrintJson, LabeledValue, LabeledValueList, 
    StatusDisplayBadge, S3Link, sortSettings, parseStatus} from "./Widgets.js"

import {GanttChart} from "./GanttChart.js"
import {ResourceChart} from "./ResourceChart.js"

import TaskDetailModal from "./TaskDetailModal.js"
import NextflowLogModal from "./NextflowLogModal.js"
import NextflowScriptModal from "./NextflowScriptModal.js"

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
            headerStyle: { width: "5%" },
            ...sortSettings
        },
        {
            dataField: "taskName",
            text: "Process",
            headerStyle: { width: "10%" },
            ...sortSettings
        },
        {
            dataField: "taskLastTrace.container",
            text: "Container",
            headerStyle: { width: "25%" },
            ...sortSettings
        },
        {
            dataField: "taskLastTrace.status",
            text: "Last Status",
            headerStyle: { width: "10%" },
            formatter: (cell, row) => (
                <span className={statusClasses[cell]}>
                    {cell}
                    {row.taskExitReason ? ` - ${row.taskExitReason}` : null}
                    {row.taskExitCode ? ` (Exit Code: ${row.taskExitCode})` : null}
                 </span>),
            ...sortSettings
        },
        {
            text: "Run Time",
            headerStyle: { width: "5%" },
            formatter: runtimeDisplay,
            ...sortSettings
        },
        {
            dataField: "taskLastTrace.attempt",
            text: "Attempt",
            headerStyle: { width: "5%" },
            ...sortSettings
        }
    ];
    return <BootstrapTable
                keyField="id"
                data={data}
                columns={columns}
                defaultSorted={[{dataField: "taskId", order: "asc"}]}
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

const StopWorkflowButton = ({aws_status, nf_status, workflow_arn}) => {
    const status = parseStatus(aws_status, nf_status);
    const {loading, payload, error, query } = useQuery({endpoint: `/api/v1/workflow/${workflow_arn}`, method: 'DELETE'}, false);
    const [isArmed, setArmed] = useState(false);
    const [isStopping, setIsStopping] = useLocalStorage(workflow_arn + ".stopStatus", false);
    const handleStop = () => {
        setArmed(false);
        setIsStopping(true);
        query();
    }
    const button_text = isStopping 
        ? <span>Stopping...</span>
        : <span><GoStop style={{marginTop: "-3px"}}/> Stop Workflow</span>;

    if (["PROVISIONING", "PENDING", "STARTING", "RUNNING"].indexOf(status) > -1){
        return (
            <React.Fragment>
            <Button variant="outline-danger mt-3" style={{width: "100%"}} onClick={() => setArmed(true)} disabled={isStopping}>
             {button_text}
            </Button>
            <Modal show={isArmed} onHide={()=>setArmed(false)} animation={false}>
              <Modal.Body><b>Are you sure you want to stop this workflow?</b> Intermediate files will be cached for future restart.</Modal.Body>
              <Modal.Footer>
                <Button variant="default" onClick={()=>setArmed(false)}>Cancel</Button>
                <Button variant="danger" onClick={()=> handleStop()}>Stop Workflow</Button>
              </Modal.Footer>
            </Modal>
            </React.Fragment>);
    } else {
        return null;
    }
}

const ProgressBar = ({onDone, isActive}) => {
    const [progressPercentage, setProgressPercentage] = useState(100); 
    useInterval(() => {
        // will refresh every 30 seconds
        setProgressPercentage(progressPercentage - 1)
        if (progressPercentage <= 0){
            onDone()
            setProgressPercentage(100)
        }
    }, isActive ? 300 : null)

    return (
        <span 
          style={{
            width: `${progressPercentage}%`, 
            visibility: isActive ? "visible" : "hidden"}} 
          className='progress' />
        )
}

function WorkflowDetailView({ runArn }) {
    document.title = "Workflow Detail"
    const { loading: runDataIsLoading, payload: runData, error: runDataisError, query: doRunQuery } = useQuery({endpoint: `/api/v1/workflow/${runArn}`, method: 'GET'});
    const { loading: taskDataIsLoading, payload: taskData, error: taskDataisError, query: doTaskQuery } = useQuery({endpoint: `/api/v1/workflow/${runArn}/tasks`, method: 'GET'});
    const [taskModalData, setTaskModalData] = useState(false);
    const [nextflowModalData, setNextflowModalData] = useState(false);
    const [nextflowScriptData, setNextflowScriptModalData] = useState(false);
    const [summaryViewSetting, setSummaryViewSetting] = useState("summary"); // "summary" | "json"

    // state used to track auto-refresh
    const [autoRefreshSetting, setAutoRefreshSetting] = useState(null); // true (on) | false (off)
    const handleRefresh = () => {
        // fetch new data when ProgressBar triggers
        doRunQuery()
        doTaskQuery()
    }
    useEffect(() => {
        // only turn on autorefresh for not-yet-completed workflows
        setAutoRefreshSetting(runData && (runData.nextflowWorkflowEndDateTime == null))
    }, [runData])

    if (runDataIsLoading || taskDataIsLoading) {
        if (!runData || !taskData){ 
            // only display loading state if no data exists
            return <div>Loading</div>
        }
    }
    if (runDataisError || taskDataisError) {
        return <div>Error</div>
    }

    if (runData.nextflowMetadata == null) {
        runData.nextflowMetadata = {workflow: {manifest: {}}};
        runData.info = {};
    }

    if (runData.launchMetadata == null){
        runData.launchMetadata = {}
    }
    
    const runTime = runData.nextflowWorkflowEndDateTime
            ? timeConversion(Date.parse(runData.nextflowWorkflowEndDateTime) - Date.parse(runData.fargateCreatedAt))
            : timeConversion(new Date() - Date.parse(runData.fargateCreatedAt))

    const NA_STRING = "Not yet available";
    const now = new Date();
    const manifest = runData.nextflowMetadata.workflow.manifest
    return (
        <Container fluid style={{minHeight:1800}}>
            <h2 style={{display: "inline-block"}}>{manifest.name || "Workflow Detail"} <span style={{fontSize: 20, paddingLeft: 12}} className="text-muted">{manifest.version ? <span><TagIcon /> manifest.version</span> : null}</span></h2>
            <div style={{display: "inline-block", marginLeft: 30}} className='toolbar'>
                <ToggleButtonGroup type="radio" value={summaryViewSetting} onChange={setSummaryViewSetting} name="summaryViewSettingToggle">
                  <ToggleButton className='mini-button-group' variant="outline-secondary" size="sm" value="summary">Summary</ToggleButton>
                  <ToggleButton className='mini-button-group' variant="outline-secondary" size="sm" value="json">JSON</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup type="radio" value={autoRefreshSetting} onChange={setAutoRefreshSetting} name="autoRefreshSettingToggle">
                  <ToggleButton className='mini-button-group progress-container' variant="outline-secondary" size="sm" value={true}>Auto-refresh On<ProgressBar isActive={autoRefreshSetting} onDone={handleRefresh} /></ToggleButton>
                  <ToggleButton className='mini-button-group' variant="outline-secondary" size="sm" value={false}>Off</ToggleButton>
                </ToggleButtonGroup>
            </div>
        <Row>
        <Col md='7' sm="12">
            <div className="workflow-detail-well" >
            { summaryViewSetting === "summary"
            ? (<div><Row>
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
                        <h3 style={{marginTop: 4, marginRight: 10}}>
                            <StatusDisplayBadge
                                aws_status={runData.fargateLastStatus}
                                nf_status={runData.nextflowLastEvent}
                            />
                        </h3>
                    </Col>
                </Row>
                <Row>
                    <Col md="4">
                        <LabeledValue label="Username" value={runData.username || NA_STRING} />
                    </Col>
                    <Col>
                        <LabeledValue label="Workgroup" value={runData.workgroup || NA_STRING} />
                    </Col>
                    <Col>
                        <LabeledValue label="Launch Type" value={runData.launchMetadata.execution_type || "unknown"} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <LabeledValue label="Nextflow Command" value={runData.nextflowMetadata.workflow.commandLine || NA_STRING} />
                    </Col>
                </Row>
                {runData.launchMetadata.execution_type === "GIT_URL" && 
                    (<Row>
                        <Col>
                            <LabeledValue label="Repository" value={runData.launchMetadata.git_url || NA_STRING} />
                        </Col>
                        <Col>
                            <LabeledValue label="SHA" value={runData.launchMetadata.git_hash || NA_STRING} />
                        </Col>
                    </Row>)
                }
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
                {runData.launchMetadata.params_loc !== undefined &&
                    (<Row>
                        <Col>
                            <LabeledValue label="Params.json" value={runData.launchMetadata.params_loc || NA_STRING} />
                        </Col>
                    </Row>)
                }
                </div>)
            : <PrettyPrintJson data={runData} />
            }
            </div>
            { runData.cacheTaskArn && (
                <Alert variant="warning">
                    <LabeledValue style={{marginBottom: 0}}
                        label={<span><GoSync style={{color: "blue"}}/> Resumed from</span>} 
                        value={<Link to={`/workflows/${runData.cacheTaskArn}`}>{runData.cacheTaskArn}</Link> || NA_STRING} 
                    />
                </Alert>) 
            }
        </Col>
        <Col md="2">
            <Button variant="outline-primary" style={{width: "100%"}} onClick={() => setNextflowModalData({workflowTaskArn: runData.fargateTaskArn})} >
                View Nextflow Logs
            </Button>
            {runData.launchMetadata.execution_type === "FILES" && <>
                <Button variant="outline-primary mt-3" style={{width: "100%"}} onClick={() => setNextflowScriptModalData({workflowTaskArn: runData.fargateTaskArn})} >
                    View Script and Config Files
                </Button>
                <Button variant="outline-secondary mt-3" style={{width: "100%"}} onClick={() => navigate(`/submit/editor?arn=${runData.fargateTaskArn}`)}>
                    Edit and Resubmit
                </Button></>
            }
            {runData.launchMetadata.execution_type === "GIT_URL" &&
                <Button variant="outline-secondary mt-3" style={{width: "100%"}} onClick={() => navigate(`/submit/template?arn=${runData.fargateTaskArn}`)}>
                    Edit and Resubmit
                </Button>
            }
            <StopWorkflowButton 
                aws_status={runData.fargateLastStatus}
                nf_status={runData.nextflowLastEvent}
                workflow_arn={runData.fargateTaskArn}
            />
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
            <Col xs="12"><h4>Tasks</h4></Col>
            <Col md="9">
                <Tabs defaultActiveKey="list" id="tasks-detail-tabs" transition={false} >
                  <Tab eventKey="list" title="List">
                    <TaskTable data={taskData} handleClick={setTaskModalData} />
                  </Tab>
                  <Tab eventKey="timeline" title="Timeline View">
                    <GanttChart taskData={taskData} workflowStart={Date.parse(runData.nextflowMetadata.workflow.start || NA_STRING)}/>
                  </Tab>
                  <Tab eventKey="raw" title="JSON">
                    <PrettyPrintJson data={taskData} />
                  </Tab>
                  <Tab eventKey="resources" title="Resource Utilization">
                    <ResourceChart taskData={taskData} />
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
        <NextflowScriptModal
            data={nextflowScriptData}
            showHandler={setNextflowScriptModalData}
        />
        </Container>
    )    
}

export default WorkflowDetailView;
