import React from "react";
import Badge from 'react-bootstrap/Badge'
import { GoDash, GoChevronUp, GoChevronDown, GoClippy } from 'react-icons/go';
import { useClipboard } from 'use-clipboard-copy';


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


export const parseStatus = (aws_status, nf_status) => {
    if (aws_status == "PROVISIONING"){
        return "PROVISIONING"
    } else if (aws_status == "PENDING") {
        return "PENDING"
    } else if (aws_status == "RUNNING") {
        if (nf_status == "started") {
            return "RUNNING"
        } else if (nf_status == "completed") {
            return "COMPLETE"
        } else if (nf_status == "error") {
            return "ERROR"
        } else {
            return "STARTING"
        }
    } else if (aws_status == "STOPPED") {
        if (nf_status == "completed") {
            return "COMPLETE"
        } else if (nf_status == "error") {
            return "ERROR"
        }
    }
    return `UNKNOWN (${aws_status} | ${nf_status})`
};


export const BADGE_STYLES = {
    "PROVISIONING": "secondary",
    "PENDING": "secondary",
    "STARTING": "secondary",
    "RUNNING": "info",
    "COMPLETE": "success",
    "ERROR": "danger"
}

export const StatusDisplayBadge = ({aws_status, nf_status}) => {
    const text = parseStatus(aws_status, nf_status)
    const style = BADGE_STYLES[text] || "dark"
    return (<Badge variant={style}>{text}</Badge>)
};


export const S3Link = ({url}) => {
    const clipboard = useClipboard({copiedTimeout: 2000});
    try {
        if (url.startsWith('s3://')){
            const p = url.endswith("/") ? "browse" : "file"
            const target = `https://cloudfiles.labmed.uw.edu/${p}/${url.slice(5)}`
            return (<>
                <a href={target} target="_blank">{url}</a>
                <GoClippy onClick={() => clipboard.copy(url)} className='copy-icon' />
                {clipboard.copied ? 'Copied!' : null}
            </>)
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
