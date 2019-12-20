import React, { useState, useRef, useEffect, useContext, useMemo } from "react";
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
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import { GoLightBulb, GoZap, GoInfo } from 'react-icons/go';

import "bootstrap/dist/css/bootstrap.css";

import SchemaForm from "react-jsonschema-form";

import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/keybinding-sublime";
import AceEditor from "react-ace"

const handleError = (response) => {
    if (!response.ok) { return false }
    return response.json()  //we only get here if there is no error
}

const log = (type) => console.log.bind(console, type);

function TemplateLaunchForm(props) {
    
    const profile = useContext(ProfileContext)

    const [workflowUrl, setWorkflowUrl] = useState("");
    const [templateSchema, setTemplateSchema] = useState({});
    const [mode, setMode] = useState();

    const template = useMemo(() => {
      try {
        const contentUrl = workflowUrl.replace("github.com", "raw.githubusercontent.com")
        Promise.all([
            fetch(`${contentUrl}/master/template.json`).then(handleError),
            fetch(`${contentUrl}/master/params.json`).then(handleError),
            fetch(`${contentUrl}/master/nextflow.config`),
        ]).then(([templateRes, paramsRes, configRes]) => {
          if (templateRes){
            setTemplateSchema(templateRes)
            setMode("template")
          } else if (paramsRes) {
            setResultVal(paramsRes)
            setMode("params")
          } else {
            setMode("none")
          }

        })
      } catch(err) {
        console.log(err)
      }
    }, [workflowUrl])
    const paramsFormRef = useRef(null);
    const [nextflowProfile, setNextflowProfile] = useState("aws");
    const [resultVal, setResultVal] = useState();
    const handleSubmit = ({formData}, e) => {
      const [url, hash] = workflowUrl.split("#")
      const payload = {
          git_url: url,
          git_hash: hash,
          nextflow_profile: nextflowProfile,
          nextflow_params: JSON.stringify(formData),
           //resume_fargate_task_arn: resumeSelection || "",
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
    const handleJsonEdit = (text) => {
      try {
        const jsonVal = JSON.parse(text)
        setResultVal(jsonVal);
      } catch {
        return false
      }
    }
    return (
        <Container fluid>
        <Row>
            <Col><h2>Submit via template</h2></Col>
        </Row>
        <Row>
        <Col style={{'maxWidth': 976}}>
        <Form className='mt-4' id='git-upload-form'>
            <Form.Group as={Row} controlId="formUrl">
              <Form.Label column sm={3}>Repository URL:</Form.Label>
              <Col sm={9}>
                <Form.Control type="input" value={workflowUrl} onChange={(e) =>setWorkflowUrl(e.target.value)}/>
                {mode === "template" ? <div className="mt-2"><GoInfo color="green"/> Using <tt style={{fontSize: 16}}>template.json</tt>. You may edit values below before submitting.</div> : null}
                {mode === "params" ? <div className="mt-2"><GoInfo color="green"/> Using <tt style={{fontSize: 16}}>params.json</tt>. You may edit values below before submitting.</div> : null}
                {mode === "none" ? <div className="mt-2"><GoInfo color="orange"/> No parameter specification found. If needed, edit or upload appropriate params.json below before submitting.</div> : null}
              </Col>
            </Form.Group>
            {workflowUrl &&
              <div>
                <Form.Group as={Row} controlId="parameters">
                  <Form.Label column sm={3}>
                    Parameters:<br/>
                    {mode === "template" && <span style={{fontWeight: "400", fontStyle: "italic", color: "#999"}}>* indicates required field</span>}
                  </Form.Label>
                  <Col sm={9}>
                    <Tabs defaultActiveKey={mode} id="params-tabs" transition={false} >
                      {mode === "template" && 
                        <Tab eventKey="template" title="Template">
                          <SchemaForm schema={templateSchema}
                              formData={resultVal}
                              ref={paramsFormRef}
                              onSubmit={handleSubmit}
                              onChange={({formData}) => setResultVal(formData)}
                              onError={log("errors")} 
                              showErrorList={false}
                          ><div></div></SchemaForm>
                        </Tab>
                      }
                      <Tab eventKey="params" title="Edit JSON">
                        <AceEditor
                          mode="text"
                          keyboardHandler="sublime"
                          value={JSON.stringify(resultVal,undefined, 2)}
                          onChange={handleJsonEdit}
                          name="filed-editor-div"
                          editorProps={{ $blockScrolling: true }}
                          theme="github"
                          height="300px"
                          width="100%"
                          showPrintMargin={false}
                          focus={true} />
                      </Tab>
                      <Tab eventKey="upload" title="Upload" disabled={true}>
                      </Tab>
                    </Tabs>
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
                        {mode === "template" && <Button size="lg" onClick={() => paramsFormRef.current.submit()}>Run Workflow <GoZap /></Button>}
                        {mode === "params" && <Button size="lg" onClick={() => handleSubmit({formData: resultVal})}>Run Workflow <GoZap /></Button>}
                    </div>
                </Form.Group>
              </div>
            //end if workflowUrl
        } 
        </Form>
        </Col>
        </Row>
        </Container>
    )    
}

export default TemplateLaunchForm;
