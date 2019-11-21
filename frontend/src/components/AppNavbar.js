import React, { useState, useContext } from "react";
import { Link } from "@reach/router"

import "bootstrap/dist/css/bootstrap.css";

import Navbar from 'react-bootstrap/Navbar';
import Nav from "react-bootstrap/Nav";
import NavDropdown from 'react-bootstrap/NavDropdown';

import { ProfileContext } from "../App.js";

function AppNavbar(props) {
	const profile = useContext(ProfileContext)
    return (
		<Navbar id='navbar' bg="info" variant="dark" fixed="top">
		  <Navbar.Brand as={Link} to="/">Batchman</Navbar.Brand>
		  <Navbar.Toggle aria-controls="basic-navbar-nav" />
		  <Navbar.Collapse>
	    	<Nav className="mr-auto">
	      	<Nav.Link as={Link} to="/workflow">Workflows</Nav.Link>
	      	<Nav.Link as={Link} to="/submit">Submit</Nav.Link>
	      	</Nav>
	      	<Nav pullRight>
	      	<NavDropdown className='mr-sm-2'
	      		title={<span className='font-weight-bold' style={{color: "white"}}>{"Workgroup: " + profile.selectedWorkgroup.display_name}</span>}
	      		onSelect={(key) => profile.setWorkgroup(key)}
	      		id="workgroup-nav-dropdown">
		        {profile.workgroups.map(w => (<NavDropdown.Item eventKey={w.name}>{w.display_name}</NavDropdown.Item>))}
		    </NavDropdown>
	    	</Nav>
		  </Navbar.Collapse>
		</Navbar>
    );
}

export default AppNavbar;
