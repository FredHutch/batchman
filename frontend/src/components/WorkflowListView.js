import React from "react";

import "bootstrap/dist/css/bootstrap.css";
import Container from "react-bootstrap/Container";

import { useFetch } from "../hooks.js";

const PrettyPrintJson = ({data}) => (<div><pre>{ 
    JSON.stringify(data, null, 2) }</pre></div>);


function WorkflowListView(props) {
    document.title = "All Workflows"
    const [data, isLoading, isError] = useFetch("/api/v1/workflow");

    if (!isLoading && !isError) {
        return <PrettyPrintJson data={data} />
    } else {
        return <div>Loading</div>
    }
}

export default WorkflowListView;
