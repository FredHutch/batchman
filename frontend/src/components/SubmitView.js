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

import { Typeahead } from 'react-bootstrap-typeahead';

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-groovy";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/keybinding-sublime";

import { exampleScript, exampleConfig } from "../examples.js"

import { parseStatus, BADGE_STYLES } from "./Widgets.js"
import { format, formatRelative } from 'date-fns/fp'

const now = new Date();

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
                <Typeahead
                    id="resume-box-selector"
                    dropup={true}
                    minLength={0}
                    placeholder="Select prior run for resume..."
                    options={resumeData}
                    isLoading={resumeDataIsLoading}
                    bsSize="large"
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
