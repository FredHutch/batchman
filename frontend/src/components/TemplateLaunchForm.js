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

import UploadEditor from "./UploadEditor.js"
import ResumeSelectorComponent from "./ResumeSelectorComponent.js"

const handleError = (response) => {
    if (!response.ok) { return false }
    return response.json()  //we only get here if there is no error
}

const log = (type) => console.log.bind(console, type);

function TemplateLaunchForm(props) {
    // for workgroup
    const userProfile = useContext(ProfileContext)
    // resume selector
    const [resumeData, resumeDataIsLoading, resumeDataIsError] = useFetch("/api/v1/workflow");
    const [resumeSelection, setResumeSelection] = useState(null);
    // profile information
    const [nextflowProfile, setNextflowProfile] = useState();
    const [nextflowConfig, setNextflowConfig] = useState();
    // form fields + params
    const [workflowUrl, setWorkflowUrl] = useState("");
    const [workflowHash, setWorkflowHash] = useState("master");
    const [templateSchema, setTemplateSchema] = useState({});
    const [jsonParams, setJsonParams] = useState();
    const [uploadParams, setUploadParams] = useState(null);
    const [mode, setMode] = useState();
    const [errorMsg, setErrorMsg] = useState();

    const paramsFormRef = useRef(null);

    const generateRawUrl = (url, hash) => {
      if (url.includes("github.com")){
        const rawurl = url.replace("github.com", "raw.githubusercontent.com")
        return `${rawurl}/${hash}`
      } else if (url.includes("gitlab.com")) {
        return `${url}/raw/${hash}/`
      } else {
        // todo: raise error
      }
    }

    useMemo(() => {
      try {
        const rawUrl = generateRawUrl(workflowUrl, workflowHash);
        Promise.all([
            fetch(`${rawUrl}/template.json`).then(handleError),
            fetch(`${rawUrl}/params.json`).then(handleError),
            fetch(`${rawUrl}/nextflow.config`).then((r) => r.text()),
        ]).then(([templateRes, paramsRes, configRes]) => {
          if (templateRes){
            setTemplateSchema(templateRes)
            setMode("template")
          } else if (paramsRes) {
            setJsonParams(paramsRes)
            setMode("params")
          } else {
            setMode("none")
          }
          // parse nextflow.config file
          if (configRes){
            fetch("/api/v1/parse_nextflow_config", {
              method: "POST",
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({nextflow_config: configRes})
            })
            .then(handleError)
            .then(data => {
              setNextflowConfig(data);
              setNextflowProfile(data.valid_profiles[0])
              console.log(data["errors"]);
            })
            .catch(error => {console.log(error)})
          }
        })
      } catch(err) {
        console.log(err)
      }
    }, [workflowUrl, workflowHash])


 
    const {arn} = parse(props.location.search);
    useEffect(
        // fill in form if prior arn is passed in via query
        (arn) => {
          if (arn !== undefined){
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
                    if (data.contents !== undefined){
                      setMode("params")
                      setJsonParams(data.contents)
                    }
                })
                .catch(error => {console.log(error)})
          }
        },
        [props.arn]
    )

    const handleSubmit = () => {
        var nextflow_params, parsedParams;
        if (uploadParams){ // if file uploaded, use that
          // validate if uploaded file is valid as submitted
          try {
            parsedParams = JSON.parse(uploadParams)
          } catch (err) {
            setErrorMsg("Error parsing uploaded JSON")
            return false
          }
          _handleSubmit(parsedParams)
        } else if (jsonParams) { // if template or json editing happened (these are synced)
          paramsFormRef.current.submit()
        } else {
          _handleSubmit(null)
        }
        
    }
    const _handleSubmit = (params) => {
        if (nextflowProfile == undefined){
          setErrorMsg("Please specify a profile.")
          return false;
        }

        const payload = {
            git_url: workflowUrl,
            git_hash: workflowHash,
            nextflow_profile: nextflowProfile,
            nextflow_params: JSON.stringify(params, undefined, 2),
            resume_fargate_task_arn: resumeSelection || "",
            workgroup: userProfile.selectedWorkgroup.name
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
        .catch(error => {error.json().then(setErrorMsg)})
    }
    const handleJsonEdit = (text) => {
      try {
        const jsonVal = JSON.parse(text)
        setJsonParams(jsonVal);
      } catch {
        return false
      }
    }

    var profile_selector;
    if (nextflowConfig) {
      if (nextflowConfig.valid_profiles.length > 0) {
        profile_selector = (
          <Form.Control as="select" value={nextflowProfile} onChange={(e) =>setNextflowProfile(e.target.value)}>
            {nextflowConfig.valid_profiles.map(p => <option key={p}>{p}</option>)}
          </Form.Control>
        );
      } else {
        profile_selector = (
          <Form.Control as="select" required={true} value={nextflowProfile} onChange={(e) =>setNextflowProfile(e.target.value)}>
            <option value="" disabled selected>Please select a profile</option>
            {Object.keys(nextflowConfig.config.profiles).map(p => <option key={p}>{p}</option>)}
          </Form.Control>
        );
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
              <Form.Label column sm={3}>Workflow Repository:</Form.Label>
              <Col sm={9}>
              <Form.Row>
                <Form.Group as={Col} sm="9" controlId="validationCustom01">
                  <Form.Label style={{fontWeight: 400}}>URL</Form.Label>
                  <Form.Control type="input" value={workflowUrl} onChange={(e) =>setWorkflowUrl(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} sm="3" controlId="validationCustom02">
                  <Form.Label style={{fontWeight: 400}}>Branch, tag or SHA</Form.Label>
                  <Form.Control type="input" placeholder='master' value={workflowHash} onChange={(e) =>setWorkflowHash(e.target.value)}/>
                </Form.Group>
                </Form.Row>
                {mode === "template" ? <div className="mt-2"><GoInfo color="green"/> Using <tt style={{fontSize: 16}}>template.json</tt>. You may edit values below before submitting or upload a new file.</div> : null}
                {mode === "params" ? <div className="mt-2"><GoInfo color="green"/> Using <tt style={{fontSize: 16}}>params.json</tt>. You may edit values below before submitting or upload a new file.</div> : null}
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
                        <Tab eventKey="template" title="Template" disabled={uploadParams !== null}>
                          <SchemaForm schema={templateSchema}
                              formData={jsonParams}
                              ref={paramsFormRef}
                              onSubmit={({formData}) => _handleSubmit(formData)}
                              onChange={({formData}) => setJsonParams(formData)}
                              onError={log("errors")} 
                              showErrorList={false}
                          ><div></div></SchemaForm>
                        </Tab>
                      }
                      <Tab eventKey="params" title="Edit JSON" disabled={uploadParams !== null}>
                        <AceEditor
                          mode="text"
                          keyboardHandler="sublime"
                          value={JSON.stringify(jsonParams, undefined, 2)}
                          onChange={handleJsonEdit}
                          name="filed-editor-div"
                          editorProps={{ $blockScrolling: true }}
                          theme="github"
                          height="300px"
                          width="100%"
                          showPrintMargin={false}
                          focus={true} />
                      </Tab>
                      <Tab eventKey="upload" title="Upload">
                        <UploadEditor fileContents={uploadParams} setFileContents={setUploadParams}/>
                      </Tab>
                    </Tabs>
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="formUrl">
                  <Form.Label column sm={3}>Nextflow Profile:</Form.Label>
                  <Col sm={9}>
                     {profile_selector}
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
                        dropup={false}
                        bsSize="medium"
                    />
                  </Col>
                </Form.Group>
                <Form.Group>
                    <div style={{textAlign: "right"}}>
                      <Button size="lg" onClick={() => handleSubmit()}>Run Workflow <GoZap /></Button>
                    </div>
                    {errorMsg !==null ? <pre className='text-danger'>{errorMsg}</pre> : null}
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
