import React from "react";
import { format, formatRelative } from 'date-fns/fp'
import { parseStatus, BADGE_STYLES } from "./Widgets.js"
import Button from "react-bootstrap/Button";

import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-bootstrap-typeahead/css/Typeahead-bs4.css';

const now = new Date();

const ResumeSelectorComponent = ({resumeData, resumeDataIsLoading, resumeSelection, setResumeSelection, ...props}) => 
     { return resumeSelection 
        ? <span>{resumeSelection}
            <span style={{float: "right"}}>
                <Button onClick={() => setResumeSelection(null)} variant='outline-secondary'>Clear</Button></span>
          </span>
        : <Typeahead
                id="resume-box-selector"
                dropup={true}
                minLength={0}
                placeholder="Select prior run for resume..."
                options={resumeData}
                isLoading={resumeDataIsLoading}
                bsSize="large"
                clearButton={true}
                onChange={(i) => {
                    const val = i[0] ? i[0].fargateTaskArn : null;
                    setResumeSelection(val)
                }}
                labelKey={(i) => i.nextflowRunName || "unknown"}
                renderMenuItemChildren={(option, props, index) => {
                    const status = parseStatus(option.runnertaskstatus, option.nextflowlastevent);
                    const date_string = formatRelative(now, new Date(option.fargateCreatedAt)).capFirstLetter()
                    return (
                        <div className='searchresult'>
                        <div className='key'>{option.nextflowRunName || "unknown"}</div>
                            <div>
                                 <span style={{fontSize: 12, color: "#999", paddingRight: 10}}>{date_string}</span>
                                 <span className={"text-" + BADGE_STYLES[status]} style={{fontSize: 12, fontWeight: "bold"}}>
                                    {status}
                                </span>
                            </div>
                        </div>);
                }}
                {...props}
            />
};

export default ResumeSelectorComponent;