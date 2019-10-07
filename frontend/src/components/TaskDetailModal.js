import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Card from "react-bootstrap/Card";

import { useFetch } from "../hooks.js";

import {PrettyPrintJson, LabeledValue, LabeledValueList} from "./Widgets.js"


const LogViewer = ({url}) => {
	const [logData, isLoading, isError] = useFetch(url);
	const formatDate = (ts) => new Date(ts).toISOString().slice(0, 19).replace('T', ' ')
	return (isLoading || isError)
		? <span>Loading</span>
		: (<table className='log-table w-100'>
			<thead>
				<tr>
				<th className='timestamp' style={{width: "15%"}}>Timestamp</th>
				<th>Message</th>
				</tr>
			</thead>
				{logData.events.map((e) => (<tr><td>{formatDate(e.timestamp)}</td><td>{e.message}</td></tr>))}
		  </table>);
};

const TaskDetailModal = ({data, showHandler}) => {
	console.log(data)
	if (data == false) {
		return null;
	}
	return (
		<Modal
          dialogClassName="detail-modal"
          show={data != false}
          onHide={() => showHandler(false)}
          aria-labelledby="detail-modal"
          animation={false}
          backdrop={true}
          backdropClassName="modal-backdrop"
        >
          <Modal.Body>
	          <h4>{data.trace.name} - Detail</h4>
	          <div className="workflow-detail-well" >
	          	<LabeledValue label="Container" value={<pre>{data.trace.container}</pre>} />
	          	<LabeledValue label="Work Directory" value={<pre>{data.trace.workdir}</pre>} />
	          	<LabeledValue label="Env" value={<pre>{data.trace.env}</pre>} />
	          </div>
	          
	          <h4>Execution Commands</h4>
	          <div className="workflow-detail-well" >
	          	<pre>{data.trace.script.replace(/^\n/g, '')}</pre>
	          </div>

	          <h4>Logs</h4>
	          <div className="workflow-detail-well" >
	          	<LogViewer url={`/api/v1/workflow/${data.workflowTaskArn}/tasks/${data.task_id}/logs`}/>
	          </div>
          </Modal.Body>
        </Modal>
    );
 };

 export default TaskDetailModal;