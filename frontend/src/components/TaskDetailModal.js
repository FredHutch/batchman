import React from "react";
import Modal from "react-bootstrap/Modal";

import { LabeledValue, S3Link} from "./Widgets.js"
import {LogViewer} from "./LogViewer.js"

const TaskDetailModal = ({data, showHandler}) => {
	console.log(data)
	if (data === false) {
		return null;
	}
	return (
		<Modal
          dialogClassName="detail-modal"
          show={data !== false}
          onHide={() => showHandler(false)}
          aria-labelledby="detail-modal"
          animation={false}
          backdrop={true}
          backdropClassName="modal-backdrop"
        >
          <Modal.Body>
	          <h4>{data.taskLastTrace.name} - Detail</h4>
	          <div className="workflow-detail-well" >
	          	<LabeledValue label="Container" value={data.taskLastTrace.container} />
	          	<LabeledValue label="Work Directory" value={data.taskLastTrace.workdir} />
	          	<LabeledValue label="Env" value={data.taskLastTrace.env} />
	          </div>
	          
	          <h4>Execution Commands</h4>
	          <div className="workflow-detail-well" >
	          	<pre>{data.taskLastTrace.script.replace(/^\n/g, '')}</pre>
	          </div>

	          <h4>Logs</h4>
	          <div className="workflow-detail-well" >
	          	<LogViewer url={`/api/v1/workflow/${data.fargateTaskArn}/tasks/${data.taskId}/logs`}/>
	          </div>
          </Modal.Body>
        </Modal>
    );
 };

 export default TaskDetailModal;