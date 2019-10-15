import React from "react";

import Modal from "react-bootstrap/Modal";

import {LogViewer} from "./LogViewer.js"

const NextflowLogsModal = ({data, showHandler}) => {
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
	          <h4>Nextflow Execution Log</h4>
	          <div className="workflow-detail-well" >
	          	<LogViewer url={`/api/v1/workflow/${data.workflowTaskArn}/logs`}/>
	          </div>
          </Modal.Body>
        </Modal>
    );
 };

 export default NextflowLogsModal;