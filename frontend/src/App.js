import React from "react";
import { Router } from "@reach/router"

import AppNavbar from "./components/AppNavbar.js";
import WorkflowListView from   "./components/WorkflowListView.js";
import WorkflowDetailView from "./components/WorkflowDetailView.js";
import SubmitView from "./components/SubmitView.js";

import { ClientContextProvider } from 'react-fetching-library';
import { createClient } from 'react-fetching-library';

import './App.css';


function App() {
  const client = createClient({});

  return (
    <div className="app">
    <ClientContextProvider client={client}>
      <AppNavbar default />
      <div className='offset-top'>
        <Router>
          <WorkflowListView path="/workflows" default/>
          <WorkflowDetailView path="/workflows/:runArn" />
          <SubmitView path="/submit" />
        </Router>
      </div>
    </ClientContextProvider>
    </div>
  );
}

export default App;
