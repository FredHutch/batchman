import React,  { useContext } from "react";
import { Router, Link } from "@reach/router";

import { navigate } from "@reach/router"
import { parse } from 'query-string';

import { ProfileContext } from "../App.js";

import { GoFile, GoGitBranch, GoBeaker } from 'react-icons/go';

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.css";


import EditorLaunchForm from "./EditorLaunchForm.js"
import GitLaunchForm from "./GitLaunchForm.js"
import TemplateLaunchForm from "./TemplateLaunchForm.js"

const SubmitHome = (props) => {
    const {arn} = parse(props.location.search);
    const profile = useContext(ProfileContext)
    return (
        <Container fluid>
            <Row>
                <Col><h2>Submit Workflow ({profile.selectedWorkgroup.display_name})</h2></Col>
            </Row>
            <Row>
                <div className='d-inline-flex flex-wrap m-3'>
                <Card className='bucket-card shadow-sm' as={Link} to='editor'>
                  <Card.Body>
                    <Card.Title><GoFile size="3em" style={{color: "#999"}}/></Card.Title>
                    <Card.Title>Interactive Editor</Card.Title>
                  </Card.Body>
                </Card>
                <Card className='bucket-card shadow-sm' as={Link} to='template'>
                  <Card.Body>
                  <Card.Title><GoBeaker size="3em" style={{color: "#999"}}/></Card.Title>
                    <Card.Title>URL & Template</Card.Title>
                  </Card.Body>
                </Card>     
                </div> 
            </Row>
        </Container>
    );
}



function SubmitView(props) {
    return (
        <Router>
          <SubmitHome path="/" />
          <EditorLaunchForm path="editor" />
          <GitLaunchForm path="repository" />
          <TemplateLaunchForm path="template" />
        </Router>
        
    )    
}

export default SubmitView;
