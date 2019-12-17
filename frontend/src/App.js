import React from "react";
import { Router } from "@reach/router"

import AppNavbar from "./components/AppNavbar.js";
import WorkflowListView from   "./components/WorkflowListView.js";
import WorkflowDetailView from "./components/WorkflowDetailView.js";
import SubmitView from "./components/SubmitView.js";

import { ClientContextProvider } from 'react-fetching-library';
import { createClient } from 'react-fetching-library';

import './App.css';

export const ProfileContext = React.createContext({
 workgroups: [],
 workgroup: null,
 setWorkgroup: () => {}
});

const client = createClient({});

class App extends React.Component {
  
  setWorkgroup = workgroupName => {
    const selectedWorkgroup = this.state.workgroups.filter(i => i.name == workgroupName)[0]
    this.setState({ selectedWorkgroup });
  };

  state = {
    workgroups: [],
    selectedWorkgroup: {},
    setWorkgroup: this.setWorkgroup
  };

  async componentDidMount(){
    const response = await fetch("/api/v1/profile");
    const json = await response.json();
    this.setState({
      ...this.state,
      workgroups: json.workgroups,
      selectedWorkgroup: json.workgroups[0]
    })
  }

  render(){
  return (
    <div className="app">
    
    <ClientContextProvider client={client}>
    <ProfileContext.Provider value={this.state}>
      <AppNavbar default />
      <div className='offset-top'>
        <Router>
          <WorkflowListView path="/workflows" default/>
          <WorkflowDetailView path="/workflows/:runArn" />
          <SubmitView path="/submit/*" />
        </Router>
      </div>
    </ProfileContext.Provider>
    </ClientContextProvider>
    
    </div>
  );
  }
}

export default App;
