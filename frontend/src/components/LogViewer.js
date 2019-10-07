import React, { useState } from "react";
import { useFetch } from "../hooks.js";


export const LogViewer = ({url}) => {
	const [logData, isLoading, isError] = useFetch(url);
	const formatDate = (ts) => new Date(ts).toISOString().slice(0, 19).replace('T', ' ')
	return (isLoading || isError)
		? <span>Loading</span>
		: (<table className='log-table w-100'>
			<thead>
				<tr>
				<th className='timestamp' style={{width: "15%"}}>Timestamp</th>
				<th>Message</th>
				</tr>
			</thead>
				{logData.events.map((e) => (<tr><td>{formatDate(e.timestamp)}</td><td>{e.message}</td></tr>))}
		  </table>);
};
