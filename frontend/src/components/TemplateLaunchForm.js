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

import { GoLightBulb, GoZap } from 'react-icons/go';

import "bootstrap/dist/css/bootstrap.css";


import SchemaForm from "react-jsonschema-form";

const schema = {
  type: "object",
  required: ["title"],
  properties: {
    title: {type: "string", title: "Title", default: "A new task"},
    done: {type: "boolean", title: "Done?", default: false}
  }
};
const handleError = (response) => {
    if (!response.ok) { throw response }
    return response.json()  //we only get here if there is no error
}

function TemplateLaunchForm(props) {
    const log = (type) => console.log.bind(console, type);
    const profile = useContext(ProfileContext)

    const [workflowUrl, setWorkflowUrl] = useState("");
    const [templateSchema, setTemplateSchema] = useState({});
    const template = useMemo(() => {
      const contentUrl = workflowUrl.replace("github.com", "raw.githubusercontent.com")
      fetch(`${contentUrl}/master/template.json`)
            .then(handleError)
            .then(data => {
                setTemplateSchema(data)
            })
            .catch(error => {console.log(error)})
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
              </Col>
            </Form.Group>
            <Form.Group as={Row} controlId="parameters">
              <Form.Label column sm={3}>
                Parameters:<br/>
                <span style={{fontWeight: "400", fontStyle: "italic", color: "#999"}}>* indicates required field</span>
              </Form.Label>
              <Col sm={9}>
                <SchemaForm schema={templateSchema}
                    formData={resultVal}
                    ref={paramsFormRef}
                    onSubmit={handleSubmit}
                    onChange={({formData}) => setResultVal(formData)}
                    onError={log("errors")} 
                    showErrorList={false}
                ><div></div></SchemaForm>
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
                    <Button size="lg" onClick={() => paramsFormRef.current.submit()}>Run Workflow <GoZap /></Button>
                </div>
                {resultVal !==null ? <pre className='text-danger'>{JSON.stringify(resultVal)}</pre> : null}
            </Form.Group>
            
        </Form>
        </Col>
        </Row>
        </Container>
    )    
}

export default TemplateLaunchForm;
