import React from "react";

import Modal from "react-bootstrap/Modal";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";

import {FileViewer} from "./FileViewer.js"

const NextflowScriptModal = ({data, showHandler}) => {
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
	          <h4>Nextflow Script Files</h4>
	          
            <Tabs defaultActiveKey="script" id="nf-script-tabs" transition={false} >
              <Tab eventKey="script" title="Workflow Script">
                <div>
                  <FileViewer url={`/api/v1/workflow/${data.workflowTaskArn}/script`}/>
                </div>
              </Tab>
              <Tab eventKey="config" title="Config File">
                <div>
                  <FileViewer url={`/api/v1/workflow/${data.workflowTaskArn}/config`}/>
                </div>
              </Tab>
            </Tabs>
            
          </Modal.Body>
        </Modal>
    );
 };

 export default NextflowScriptModal;