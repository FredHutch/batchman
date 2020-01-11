import React, { useState, useRef, useEffect, useContext } from "react";
import { useLocalStorage, useFetch } from "../hooks.js";

import { navigate } from "@reach/router"
import * as queryString from 'query-string';

import { ProfileContext } from "../App.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

import { GoLightBulb, GoZap } from 'react-icons/go';

import "bootstrap/dist/css/bootstrap.css";

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-groovy";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/keybinding-sublime";

import { exampleScript, exampleConfig } from "../examples.js"

import ResumeSelectorComponent from "./ResumeSelectorComponent.js"

const EditorComponent = ({editorRef, value, onChangeHandler, isDarkMode, ...props}) => (
    <AceEditor
        ref={editorRef}
        value={value}
        onChange={onChangeHandler}
        mode="groovy"
        theme={isDarkMode ? "solarized_dark" : "solarized_light"}
        name="script-editor-div"
        editorProps={{ $blockScrolling: true }}
        height="100%"
        width="100%"
        showPrintMargin={false}
        focus={true}
        keyboardHandler="sublime"
        {...props}
    />)

const handleError = (response) => {
    if (!response.ok) { throw response }
    return response.json()  //we only get here if there is no error
}

function EditorLaunchForm(props) {    
    const [isDarkMode, setDarkMode] = useLocalStorage("darkmode", false)
    const [scriptValue, setScriptValue] = useState();
    const [configValue, setConfigValue] = useState();
    const scriptEditorRef = useRef(null);
    const configEditorRef = useRef(null);

    const [resumeData, resumeDataIsLoading, resumeDataIsError] = useFetch("/api/v1/workflow");
    const [resumeSelection, setResumeSelection] = useState(null);

    const [resultVal, setResultVal] = useState();

    const profile = useContext(ProfileContext)

    const loadExample = () => {
        scriptEditorRef.current.editor.setValue(exampleScript,1)
        configEditorRef.current.editor.setValue(exampleConfig,1)
    }

    const {arn} = queryString.parse(props.location.search);
    useEffect(
        // fill in form if prior arn is passed in via query
        () => {
            
            // Load Script
            fetch(`/api/v1/workflow/${arn}/script`)
            .then(handleError)
            .then(data => {
                scriptEditorRef.current.editor.setValue(data.contents,1)
            })
            .catch(error => {console.log(error)})

            // Load config
            fetch(`/api/v1/workflow/${arn}/config`)
            .then(handleError)
            .then(data => {
                configEditorRef.current.editor.setValue(data.contents,1)
            })
            .catch(error => {console.log(error)})

            // Set restart ARN
            setResumeSelection(arn)
        },
        [props.arn]
    )

    const handleSubmit = () => {
        const payload = {
            nextflow_workflow: scriptValue,
            nextflow_config: configValue,
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
    return (
        <Container fluid>
        <Row>
        <Col><h2>{arn ? "Resubmit" : "Submit Workflow"} ({profile.selectedWorkgroup.display_name})</h2></Col>
        <Col style={{textAlign: "right"}}>
            <Button variant="outline-secondary" className="mr-3"
                onClick={loadExample}
                disabled={arn !== undefined}
            >
                Load example
            </Button>
            <Button variant={isDarkMode ? "light" : "secondary"} onClick={() => setDarkMode(!isDarkMode)}>
                <GoLightBulb /> {isDarkMode ? "Switch to light" : "Switch to dark"}
            </Button>
        </Col>
        </Row>
        <Row>
        <Col md="12" lg="6">
            <h4 className="mt-3">Nextflow script</h4>
            <EditorComponent 
                editorRef={scriptEditorRef}
                value={scriptValue}
                onChangeHandler={setScriptValue}
                isDarkMode={isDarkMode}
                height="75vh"
              />
        </Col>
        <Col md="12" lg="6">
            <h4 className="mt-3">Config</h4>
             <EditorComponent
                editorRef={configEditorRef}
                value={configValue}
                onChangeHandler={setConfigValue}
                isDarkMode={isDarkMode}
                height="60vh"
              />
            <div className="workflow-detail-well mt-4 p-4" >
            <Row>
            <Col>
               <ResumeSelectorComponent 
                    resumeData={resumeData}
                    resumeDataIsLoading={resumeDataIsLoading}
                    resumeSelection={resumeSelection}
                    setResumeSelection={setResumeSelection}
                    dropup={true}
                />
            </Col><Col>
                <div style={{textAlign: "right"}}>
                    <Button size="lg" onClick={handleSubmit}>Run Workflow <GoZap /></Button>
                </div>
                {resultVal !==null ? <pre className='text-danger'>{JSON.stringify(resultVal)}</pre> : null}
            </Col>
            </Row>
            </div>
        </Col>
        </Row>
        </Container>
    )    
}

export default EditorLaunchForm;
