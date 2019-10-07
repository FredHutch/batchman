import React from "react";

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