import React, { useState, useRef, useEffect, useContext } from "react";
import { useQuery } from 'react-fetching-library';
import { useLocalStorage, useFetch } from "../hooks.js";

import { navigate } from "@reach/router"
import { parse } from 'query-string';

import { ProfileContext } from "../App.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import Button from "react-bootstrap/Button";

import { GoLightBulb, GoZap } from 'react-icons/go';

import "bootstrap/dist/css/bootstrap.css";

import UploadEditor from "./UploadEditor.js"
import ResumeSelectorComponent from "./ResumeSelectorComponent.js"

const handleError = (response) => {
    if (!response.ok) { throw response }
    return response.json()  //we only get here if there is no error
}

function WizardView(props) {
    document.title = "Submit Workflow"
    
    const [workflowUrl, setWorkflowUrl] = useState("");
    const [paramsData, setParamsData] = useState(null);
    const [resumeData, resumeDataIsLoading, resumeDataIsError] = useFetch("/api/v1/workflow");
    const [resumeSelection, setResumeSelection] = useState(null);
    const [nextflowProfile, setNextflowProfile] = useState("aws");

    const [resultVal, setResultVal] = useState();

    const profile = useContext(ProfileContext)

    const {arn} = parse(props.location.search);
    useEffect(
        // fill in form if prior arn is passed in via query
        () => {
            
            fetch(`/api/v1/workflow/${arn}`)
            .then(handleError)
            .then(data => {
                setWorkflowUrl(`${data.launchMetadata.git_url}#${data.launchMetadata.git_hash}`)
                setNextflowProfile(data.launchMetadata.nextflow_profile)
                setResumeSelection(arn)
            })
            .catch(error => {console.log(error)})
            fetch(`/api/v1/workflow/${arn}/params`)
            .then(handleError)
            .then(data => {
                setParamsData(data.contents)
            })
            .catch(error => {console.log(error)})
            
        },
        [props.arn]
    )

    const handleSubmit = () => {
        const [url, hash] = workflowUrl.split("#")
        const payload = {
            git_url: url,
            git_hash: hash,
            nextflow_profile: nextflowProfile,
            nextflow_params: paramsData,
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
                <UploadEditor fileContents={paramsData} setFileContents={setParamsData} />
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="formResumeSelection">
              <Form.Label column sm={3}>Resume from:</Form.Label>
              <Col sm={9}>
                <ResumeSelectorComponent 
                    resumeData={resumeData}
                    resumeDataIsLoading={resumeDataIsLoading}
                    resumeSelection={resumeSelection}
                    setResumeSelection={setResumeSelection}
                    dropup={true}
                    bsSize="medium"
                />
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="formUrl">
              <Form.Label column sm={3}>Nextflow Profile:</Form.Label>
              <Col sm={9}>
                <Form.Control type="input" value={nextflowProfile} onChange={(e) =>setNextflowProfile(e.target.value)}/>
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
