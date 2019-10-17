import React from "react";
import { useFetch } from "../hooks.js";
import { S3Link } from "./Widgets.js";

import reactStringReplace from "react-string-replace";

export const LogViewer = ({url}) => {
	const [logData, isLoading, isError] = useFetch(url);
	const formatDate = (ts) => new Date(ts).toISOString().slice(0, 19).replace('T', ' ')
	const replaceURLs = (text) => reactStringReplace(text, /(s3:\/\/\S+)/, (match, i) => <S3Link url={match} />);

	return (isLoading || isError)
		? <span>Loading</span>
		: (<table className='log-table w-100'>
			<thead>
				<tr>
				<th className='timestamp' style={{width: "15%"}}>Timestamp</th>
				<th>Message</th>
				</tr>
			</thead>
				{logData.events.map((e) => (<tr><td>{formatDate(e.timestamp)}</td><td>{replaceURLs(e.message)}</td></tr>))}
		  </table>);
};
