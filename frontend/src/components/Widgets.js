import React from "react";
import Badge from 'react-bootstrap/Badge'
import { GoDash, GoChevronUp, GoChevronDown, GoClippy } from 'react-icons/go';
import { useClipboard } from 'use-clipboard-copy';


export const PrettyPrintJson = ({data}) => (
    <div><pre>
        { JSON.stringify(data || {}, null, 2) }
    </pre></div>
);

const parseValue = (value) => {
    var contents;
    if (typeof(value) === "string"){
        if (value.startsWith("s3://")){
            contents = <S3Link url={value} />
        } else {
            contents = <span>{value}</span>
        }
    } else if (React.isValidElement(value)) {
        contents = value
    } else if (typeof(value) === "object") {
        contents = <PrettyPrintJson data={value} />
    } else {
        try {
            contents = String(value)    
        } catch {
            contents = <span>Value cannot be displayed</span>
        }
    }
    return contents;
}

export const LabeledValue = ({label, value, inline, ...props}) => {
    return (<div className='labeled-value' style={inline ? {display: "inline-block"} : {}} {...props}>
        <div className='label'>{label}</div>
        <div className='value'>
            <pre>
            {parseValue(value)}
            </pre>
        </div>
    </div>);
}

export const LabeledValueList = ({label, values, ...props}) => (
    <div className='labeled-value' {...props}>
        <div className='label'>{label}</div>
        <table className='label-list'>
        <tbody>
            {Object.keys(values).map((key, ix) => 
                <tr key={ix}><td className='label'>{key}</td><td className='value'>{parseValue(values[key])}</td></tr>
            )}
        </tbody>
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
            const target = `https://cloudfiles.labmed.uw.edu/browse/${url.slice(5)}`
            return (<>
                <a href={target} target="_blank">{url}</a>
                <GoClippy onClick={() => clipboard.copy(url)} className='copy-icon' />
                {clipboard.copied ? 'Copied!' : null}
            </>)
        } else {
            return url.toString()
        }
    } catch(error) {
        return url.toString()
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
