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
import Card from "react-bootstrap/Card";
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
    const [nextflowProfile, setNextflowProfile] = useState(null);
    const [nextflowConfig, setNextflowConfig] = useState();
    const [nextflowWorkDir, setNextflowWorkDir] = useState();
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
              // set the profile selector to the workgroup profile, if exists
              const profile_list = Object.keys(data.config.profiles);
              const default_workgroup_profile = userProfile.selectedWorkgroup.default_profile
              if (profile_list.indexOf(default_workgroup_profile) > -1){
                setNextflowProfile(default_workgroup_profile)
              }
            })
            .catch(error => {console.log(error)})
          }
        })
      } catch(err) {
        console.log(err)
      }
    }, [workflowUrl, workflowHash, userProfile])


    const {arn} = parse(props.location.search);

    useEffect(
        // fill in form if prior arn is passed in via query
        () => {
          console.log(`ARN to restore from is ${arn}`)
          if (arn !== undefined){
              fetch(`/api/v1/workflow/${arn}`)  
                .then(handleError)
                .then(data => {
                    setWorkflowUrl(data.launchMetadata.git_url)
                    setWorkflowHash(data.launchMetadata.git_hash)
                    setNextflowProfile(data.launchMetadata.nextflow_profile)
                    setResumeSelection(arn)
                    setNextflowWorkDir(data.nextflowMetadata.workflow.workDir)
                })
                .catch(error => {console.log(error)})
              fetch(`/api/v1/workflow/${arn}/params`)
                .then(handleError)
                .then(data => {
                    if (data.contents !== undefined){
                      setMode("params")
                      setJsonParams(JSON.parse(data.contents))
                    }
                })
                .catch(error => {console.log(error)})
          }
        },
        [arn]
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
            workgroup: userProfile.selectedWorkgroup.name,
            nextflow_workdir: nextflowWorkDir,
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

    const _handleProfileSelect = (profile) => {
        setNextflowProfile(profile);
        const workDir = nextflowConfig.config.profiles[profile].workDir
          || userProfile.selectedWorkgroup.default_work_dir
        setNextflowWorkDir(workDir)
    }
    
    
    const profile_selector = nextflowConfig 
      ? (<Form.Control as="select" required={true} value={nextflowProfile || "___disabled___"} onChange={(e) =>_handleProfileSelect(e.target.value)}>
          <option value="___disabled___" disabled>Please select a profile</option>
          {Object.keys(nextflowConfig.config.profiles).map(p => <option key={p} value={p}>{p} {p == userProfile.selectedWorkgroup.default_profile ? "(Workgroup Default)" : null}</option>)}
        </Form.Control>)
      : null;

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
            {nextflowConfig && 
              <Form.Group as={Row} controlId="info">
                <Form.Label column sm={3}>Workflow Metadata:</Form.Label>
                <Col sm={9}>
                <Form.Row>
                  {nextflowConfig.config.manifest
                    ? <pre>{JSON.stringify(nextflowConfig.config.manifest || {}, undefined, 2)}</pre>
                    : <div className="mt-2"><GoInfo color="orange"/> No manifest found.</div>
                  }
                </Form.Row>
                </Col>
              </Form.Group>
            }
            {workflowUrl &&
              <div>
                <Card className='form-well'>
                <Card.Title className='well-title'>Workflow Parameters</Card.Title>
                <Form.Group as={Row} controlId="parameters">
                  <Form.Label column sm={3}>
                    Parameters:<br/>
                    {mode === "template" && <span style={{fontWeight: "400", fontStyle: "italic", color: "#999"}}>* indicates required field</span>}
                  </Form.Label>
                  <Col sm={9}>
                    <Tabs defaultActiveKey={mode} id="params-tabs" transition={false} className='mb-2'>
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
                </Card>
                <Card className='form-well'>
                <Card.Title className='well-title'>Nextflow Options</Card.Title>
                <Form.Group as={Row} controlId="formUrl">
                  <Form.Label column sm={3}>Profile:</Form.Label>
                  <Col sm={9}>
                     {profile_selector}
                  </Col>
                </Form.Group>
                {nextflowWorkDir
                  ? <Form.Group as={Row} controlId="formUrl">
                      <Form.Label column sm={3}>Work Directory <br/>(-work-dir):</Form.Label>
                      <Col sm={9}>
                        <Form.Control 
                          type="input"
                          value={nextflowWorkDir}
                          onChange={(e) =>setNextflowWorkDir(e.target.value)}/>
                      </Col>
                    </Form.Group>
                  : null
                } 
                <Form.Group as={Row} controlId="formResumeSelection">
                  <Form.Label column sm={3}>Resume from:</Form.Label>
                  <Col sm={9}>
                    <ResumeSelectorComponent 
                        resumeData={resumeData}
                        resumeDataIsLoading={resumeDataIsLoading}
                        resumeSelection={resumeSelection}
                        setResumeSelection={setResumeSelection}
                        dropup={false}
                    />
                  </Col>
                </Form.Group>
                </Card>
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
