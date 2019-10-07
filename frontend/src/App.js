import React, { Component } from "react";
import { Router } from "@reach/router"

import AppNavbar from "./components/AppNavbar.js";
import WorkflowListView from   "./components/WorkflowListView.js";
import WorkflowDetailView from "./components/WorkflowDetailView.js";

import './App.css';



function App() {
  return (
    <div className="app">
      <AppNavbar default />
      <div className='offset-top'>
        <Router>
          <WorkflowListView path="/workflows" default/>
          <WorkflowDetailView path="/workflows/:runArn" />
        </Router>
      </div>
    </div>
  );
}

export default App;
