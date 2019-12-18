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


import SchemaForm from "react-jsonschema-form";

const schema = {
  type: "object",
  required: ["title"],
  properties: {
    title: {type: "string", title: "Title", default: "A new task"},
    done: {type: "boolean", title: "Done?", default: false}
  }
};

function TemplateLaunchForm(props) {
    const log = (type) => console.log.bind(console, type);
    const [workflowUrl, setWorkflowUrl] = useState("");

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
              <Form.Label column sm={3}>Parameters:</Form.Label>
              <Col sm={9}>
                <SchemaForm schema={schema}
                    onSubmit={log("submitted")}
                    onError={log("errors")} 
                />
              </Col>
            </Form.Group>
        </Form>
        </Col>
        </Row>
        </Container>
    )    
}

export default TemplateLaunchForm;
