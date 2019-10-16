import React from "react";
import { useFetch } from "../hooks.js";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import groovy from 'react-syntax-highlighter/dist/esm/languages/hljs/groovy';
import docco from 'react-syntax-highlighter/dist/esm/styles/hljs/docco';

SyntaxHighlighter.registerLanguage('groovy', groovy);


export const FileViewer = ({url}) => {
  const [fileData, isLoading, isError] = useFetch(url);
  
  return (isLoading || isError)
    ? <span>Loading</span>
    : (<SyntaxHighlighter language="groovy" style={docco} showLineNumbers={true}>
    	{fileData.contents}
       </SyntaxHighlighter>);
};