import React, { useState, useRef, useEffect, useContext } from "react";
import { useLocalStorage, useFetch } from "../hooks.js";

import { navigate } from "@reach/router"
import * as queryString from 'query-string';

import { ProfileContext } from "../App.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import Button from "react-bootstrap/Button";

import { GoLightBulb, GoZap } from 'react-icons/go';

import "bootstrap/dist/css/bootstrap.css";
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css';

import { Typeahead } from 'react-bootstrap-typeahead';

import { parseStatus, BADGE_STYLES } from "./Widgets.js"
import { format, formatRelative } from 'date-fns/fp'

const now = new Date();

const handleError = (response) => {
    if (!response.ok) { throw response }
    return response.json()  //we only get here if there is no error
}

function WizardView(props) {
    document.title = "Submit Workflow"
    
    const [workflowUrl, setWorkflowUrl] = useState("");
    const [resumeData, resumeDataIsLoading, resumeDataIsError] = useFetch("/api/v1/workflow");
    const [resumeSelection, setResumeSelection] = useState(null);

    const [resultVal, setResultVal] = useState();

    const profile = useContext(ProfileContext)

    const {arn} = queryString.parse(props.location.search);
    useEffect(
        // fill in form if prior arn is passed in via query
        () => {
            // Set restart ARN
            setResumeSelection(arn)
        },
        [props.arn]
    )

    const handleSubmit = () => {
        // TODO: separate git hash from url
        const payload = {
            git_url: workflowUrl,
            //git_hash: git_hash,
            resume_fargate_task_arn: resumeSelection || "",
            workgroup: profile.selectedWorkgroup.name
        }
        fetch("/api/v1/workflow", {
            method: "POST",
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(handleError)
        .then(data => {
            navigate(`/workflows/${data.fargateTaskArn}`)
        })
        .catch(error => {error.json().then(setResultVal)})
        
    }
    const UploadButton = () => (<Button>Upload JSON</Button>)
    return (
        <Container fluid>
        <Row>
            <Col><h2>{arn ? "Resubmit" : "Submit Workflow"} ({profile.selectedWorkgroup.display_name})</h2></Col>
        </Row>
        <Row>
        <Col style={{'maxWidth': 976}}>

            <Form className='mt-4' id='git-upload-form'>
            <Form.Group as={Row} controlId="formUrl">
              <Form.Label column sm={3}>Repository URL:</Form.Label>
              <Col sm={9}>
                <Form.Control type="input" value={workflowUrl} onChange={(e) =>setWorkflowUrl(e.target.value)}/>
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="formParamsFile">
              <Form.Label column sm={3}>Additional Parameters:</Form.Label>
              <Col sm={9}>
                <Form.Control type="file" />
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="formResumeSelection">
              <Form.Label column sm={3}>Resume from:</Form.Label>
              <Col sm={9}>
                    { resumeSelection 
                    ? <span>{resumeSelection}</span>
                    : <Typeahead
                        id="resume-box-selector"
                        dropup={true}
                        minLength={0}
                        placeholder="Select prior run for resume..."
                        options={resumeData}
                        isLoading={resumeDataIsLoading}
                        clearButton={true}
                        onChange={(i) => {
                            const val = i[0] ? i[0].fargateTaskArn : null;
                            setResumeSelection(val)
                        }}
                        labelKey={(i) => i.nextflowRunName || "unknown"}
                        renderMenuItemChildren={(option, props, index) => {
                            const status = parseStatus(option.runnertaskstatus, option.nextflowlastevent);
                            const date_string = formatRelative(now, new Date(option.fargateCreatedAt)).capFirstLetter()
                            return (
                                <div className='searchresult'>
                                <div className='key'>{option.nextflowRunName || "unknown"}</div>
                                    <div>
                                         <span style={{fontSize: 12, color: "#999", paddingRight: 10}}>{date_string}</span>
                                         <span className={"text-" + BADGE_STYLES[status]} style={{fontSize: 12, fontWeight: "bold"}}>
                                            {status}
                                        </span>
                                    </div>
                                </div>);
                        }}
                        />
                }
              </Col>
            </Form.Group>
            <Form.Group>
                <div style={{textAlign: "right"}}>
                    <Button size="lg" onClick={handleSubmit}>Run Workflow <GoZap /></Button>
                </div>
                {resultVal !==null ? <pre className='text-danger'>{JSON.stringify(resultVal)}</pre> : null}
            </Form.Group>
            </Form>

            <Row>
                
            </Row>
        </Col>
        </Row>
        </Container>
    )    
}

export default WizardView;
