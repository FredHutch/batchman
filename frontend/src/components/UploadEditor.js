import React, { useCallback, useState, useMemo, useRef } from "react";
import {useDropzone} from 'react-dropzone'

import { GoPencil } from 'react-icons/go';
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/keybinding-sublime";
import AceEditor from "react-ace";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";


// styles
const baseStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: '#eeeeee',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#bdbdbd',
  outline: 'none',
  transition: 'border .24s ease-in-out'
};

const activeStyle = {
  borderColor: '#2196f3'
};

const acceptStyle = {
  borderColor: '#00e676'
};

const rejectStyle = {
  borderColor: '#ff1744'
};





const EditorComponent = ({editorRef, value, onChangeHandler, ...props}) => (
    <AceEditor
        ref={editorRef}
        value={value}
        onChange={onChangeHandler}
        mode="json"
        name="filed-editor-div"
        editorProps={{ $blockScrolling: true }}
        height="100%"
        width="100%"
        showPrintMargin={false}
        focus={true}
        keyboardHandler="sublime"
        {...props}
    />)


const UploadEditor = ({fileContents, setFileContents}) => {
    //const {fileContents, setFileContents} = props;
    //const [fileContents, setFileContents] = useState("");
    const editorRef = useRef(null);
    const onDrop = useCallback((acceptedFiles) => {
        acceptedFiles.forEach((file) => {
          const reader = new FileReader()
          reader.onabort = () => console.log('file reading was aborted')
          reader.onerror = () => console.log('file reading has failed')
          reader.onload = (event) => {
            // executed when file is read
            console.log(event.target.result)
            setFileContents(event.target.result)
          }
          // actually read the file
          reader.readAsText(file)
        })
    }, [])
    const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({onDrop, multiple:false})
  
    const style = useMemo(() => ({
        ...baseStyle,
        ...(isDragActive ? activeStyle : {}),
        ...(isDragAccept ? acceptStyle : {}),
        ...(isDragReject ? rejectStyle : {})
      }), [
        isDragActive,
        isDragReject
      ]);
    
     return(
        <Container>
        <Row style={{float: "right"}}>
            {fileContents === null 
              ? (<Button variant="outline-info" style={{marginLeft: "10px"}}
                    onClick={() => setFileContents("")}><GoPencil style={{marginTop: "-1"}}/></Button>)
              : (<Button variant="outline-secondary" style={{marginLeft: "10px"}}
                    onClick={() => setFileContents(null)}>Clear</Button>)
            }
        </Row>
        <Row>
            {fileContents === null 
              ? (<div {...getRootProps({style})}>
                    <input {...getInputProps()} />
                    <p>Drag 'n' drop the <b>params.json</b> file here, or click to select.</p>
                    <em>(Only *.json will be accepted)</em>
                </div>)
              : (<AceEditor
                  mode="text"
                  keyboardHandler="sublime"
                  value={fileContents}
                  onChange={setFileContents}
                  name="filed-editor-div"
                  editorProps={{ $blockScrolling: true }}
                  theme="github"
                  height="300px"
                  width="100%"
                  showPrintMargin={false}
                  focus={true} />
                )
            }
        </Row>
        </Container>
    );
}

export default UploadEditor;