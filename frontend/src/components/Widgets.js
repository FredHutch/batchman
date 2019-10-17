import React from "react";
import Badge from 'react-bootstrap/Badge'
import { GoDash, GoChevronUp, GoChevronDown } from 'react-icons/go';

export const PrettyPrintJson = ({data}) => (
    <div><pre>
        { JSON.stringify(data || {}, null, 2) }
    </pre></div>
);

export const LabeledValue = ({label, value, inline, ...props}) => (
    <div className='labeled-value' style={inline ? {display: "inline-block"} : {}} {...props}>
        <div className='label'>{label}</div>
        <div className='value'><pre><S3Link url={value} /></pre></div>
    </div>
)

export const LabeledValueList = ({label, values, ...props}) => (
    <div className='labeled-value' {...props}>
        <div className='label'>{label}</div>
        <table className='label-list'>
            {Object.keys(values).map((key) => 
                <tr><td className='label'>{key}</td><td className='value'><S3Link url={values[key]} /></td></tr>
            )}
        </table>
    </div>
)


export const StatusDisplayBadge = ({aws_status, nf_status}) => {
    if (aws_status == "PROVISIONING"){
        return (<Badge variant="secondary">PROVISIONING</Badge>)
    } else if (aws_status == "PENDING") {
        return (<Badge variant="secondary">PENDING</Badge>)
    } else if (aws_status == "RUNNING") {
        if (nf_status == "started") {
            return (<Badge variant="info">RUNNING</Badge>)
        } else if (nf_status == "completed") {
            return (<Badge variant="success">COMPLETE</Badge>)
        } else if (nf_status == "error") {
            return (<Badge variant="danger">ERROR</Badge>)
        } else {
            return (<Badge variant="secondary">STARTING</Badge>)
        }
    } else if (aws_status == "STOPPED") {
        if (nf_status == "completed") {
            return (<Badge variant="success">COMPLETE</Badge>)
        } else if (nf_status == "error") {
            return (<Badge variant="danger">ERROR</Badge>)
        }
    }
    return (<Badge variant="dark">UNKNOWN ({aws_status} | {nf_status})</Badge>)
};


export const S3Link = ({url}) => {
    try {
        if (url.startsWith('s3://')){
            const target = `https://cloudfiles.labmed.uw.edu/browse/${url.slice(5)}`
            return <a href={target} target="_blank">{url}</a>
        } else {
            return url
        }
    } catch(error) {
        return url
    }
}


String.prototype.capFirstLetter = function () {
    return /[a-z]/.test(this.trim()[0]) ? this.trim()[0]
        .toUpperCase() + this.slice(1) : this;
}


export const sortSettings = {
    sort: true,
    sortCaret: (order) => (
        order === undefined
        ? <GoDash style={{color: "#999"}} />
        : order === 'asc'
            ? <GoChevronUp />
            : <GoChevronDown />)
};
