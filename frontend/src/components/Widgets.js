import React from "react";
import Badge from 'react-bootstrap/Badge'

export const PrettyPrintJson = ({data}) => (
    <div><pre>
        { JSON.stringify(data || {}, null, 2) }
    </pre></div>
);

export const LabeledValue = ({label, value, inline}) => (
    <div className='labeled-value' style={inline ? {display: "inline-block"} : {}}>
        <div className='label'>{label}</div>
        <div className='value'>{value}</div>
    </div>
)

export const LabeledValueList = ({label, values}) => (
    <div className='labeled-value'>
        <div className='label'>{label}</div>
        <table className='label-list'>
            {Object.keys(values).map((key) => 
                <tr><td className='label'>{key}</td><td className='value'>{values[key]}</td></tr>
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


String.prototype.capFirstLetter = function () {
    return /[a-z]/.test(this.trim()[0]) ? this.trim()[0]
        .toUpperCase() + this.slice(1) : this;
}
