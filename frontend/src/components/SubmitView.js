import React, { useState, useRef } from "react";
import { useLocalStorage, useFetch } from "../hooks.js";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import Button from "react-bootstrap/Button";

import { GoLightBulb, GoZap } from 'react-icons/go';

import "bootstrap/dist/css/bootstrap.css";
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css';

import { AsyncTypeahead } from 'react-bootstrap-typeahead';

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-groovy";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/keybinding-sublime";

import { exampleScript, exampleConfig } from "../examples.js"

function SubmitView(props) {
    document.title = "Submit Workflow"
    const [isDarkMode, setDarkMode] = useLocalStorage("darkmode", false)
    const [scriptValue, setScriptValue] = useState();
    const [configValue, setConfigValue] = useState();
    const scriptEditorRef = useRef(null);
    const configEditorRef = useRef(null);

    const [resumeData, resumeDataIsLoading, resumeDataIsError] = useFetch("/api/v1/workflow");

    const loadExample = () => {
        scriptEditorRef.current.editor.setValue(exampleScript,1)
        configEditorRef.current.editor.setValue(exampleConfig,1)
    }
    console.log(resumeData.map((i)=>i.nextflowRunName || "none"))
    return (
        <Container fluid>
        <Row>
        <Col><h2>Submit Workflow</h2></Col>
        <Col style={{textAlign: "right"}}>
            <Button variant="outline-secondary" className="mr-3"
                onClick={loadExample}>
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
             <AceEditor
                ref={scriptEditorRef}
                value={scriptValue}
                onChange={setScriptValue}
                mode="groovy"
                theme={isDarkMode ? "solarized_dark" : "solarized_light"}
                name="script-editor-div"
                editorProps={{ $blockScrolling: true }}
                height="75vh"
                width="100%"
                showPrintMargin={false}
                focus={true}
                keyboardHandler="sublime"
              />
        </Col>
        <Col md="12" lg="6">
            <h4 className="mt-3">Config</h4>
             <AceEditor
                ref={configEditorRef}
                value={configValue}
                onChange={setConfigValue}
                mode="groovy"
                theme={isDarkMode ? "solarized_dark" : "solarized_light"}
                name="config-editor-div"
                editorProps={{ $blockScrolling: true }}
                height="60vh"
                width="100%"
                showPrintMargin={false}
                focus={false}
                keyboardHandler="sublime"
              />
            <div className="workflow-detail-well mt-4 p-4" >
            <Row>
            <Col>
                <AsyncTypeahead
                    id="resume-box-selector"
                    dropup={true}
                    minLength={0}
                    placeholder="Select prior run for resume..."
                    options={resumeData.map((i)=>i.nextflowRunName || "none")}
                    isLoading={resumeDataIsLoading}
                    onSearch={(e)=>{console.log(e)}}
                    bsSize="large"
                />
            </Col><Col>
                <div style={{textAlign: "right"}}>
                    <Button size="lg">Run Workflow <GoZap /></Button>
                </div>
            </Col>
            </Row>
            </div>
        </Col>
        </Row>
        </Container>
    )    
}

export default SubmitView;
