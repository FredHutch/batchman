from flask import current_app, jsonify
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
import marshmallow as m # import Schema, INCLUDE, fields
import requests
import json
from app.api.groovy_config_parser import GroovyConfigSlurper

from schema import Schema, And, Use, Optional, SchemaError


ActionsApi = Blueprint(
    'ActionsApi', __name__,
    description='Endpoints for API methods not associated with `arn`.'
)

valid_schema = Schema({
    'workDir': And(Use(str), lambda s: s.startswith("s3://")),
    'process': {
        'scratch': '/docker_scratch',
        'queue': And(Use(str)),
        'executor': 'awsbatch',
        Optional('container'): And(Use(str)),
        Optional('errorStrategy'): And(Use(str)),
    },
    'aws': {
        'region': 'us-west-2',
        'batch': {
            'volumes': '/docker_scratch',
            'cliPath': '/home/ec2-user/miniconda/bin/aws'
        }
    }
});

class GetWorkflowArgs(m.Schema):
    url = m.fields.String(location="query")
    hash = m.fields.String(location="query")

def parse_nextflow_config(config):
    config = GroovyConfigSlurper(config).parse()
    valid_profiles = []
    errors = []
    for name, p in config.get("profiles", {}).items():
        try:
            valid_schema.validate(p)
            valid_profiles.append(name)
        except SchemaError as e:
            errors.append({name: str(e)})
            
    return {
        "config": config,
        "valid_profiles": valid_profiles,
        "errors": errors
    }

import urllib.parse

def enc(string):
    encoded = urllib.parse.quote(string, safe='', encoding=None)
    return encoded.replace(".", "%2E").replace("-", "%2D")

def get_remote_file(url, file, hash):
    if "github.com" in url:
        url = url.replace("github.com", "raw.githubusercontent.com").rstrip("/")
        return requests.get(f"{url}/{hash}/{file}")
    if "gitlab.labmed.uw.edu" in url:
        headers = {
            "PRIVATE-TOKEN": current_app.config["GITLAB_TOKEN"] #"ovAFK5zoUhxYBEnA2ef9"
        }
        # the passed URL will look like this:
        #   https://gitlab.labmed.uw.edu/uwlabmed/crux-pipeline
        # what we need to generate is somethig like:
        #    https://gitlab.labmed.uw.edu/api/v4/projects/uwlabmed%crux%2Dpipeline/repository/files/template%2Ejson?ref=master"
        
        project_id = urllib.parse.urlsplit(url).path.lstrip("/")

        url = "https://gitlab.labmed.uw.edu/api/v4/projects/" \
              + enc(project_id) \
              + "/repository/files/" \
              + enc(file) \
              + "/raw?ref=" + hash
        return requests.get(url, headers=headers)
    else:
        raise NotImplementedError("unknown repository host")



def get_json(resp):
    try:
        return resp.json()
    except json.decoder.JSONDecodeError:
        return {}

@ActionsApi.route('/get_workflow')
class NextflowConfigParse(MethodView):
    @ActionsApi.arguments(GetWorkflowArgs)
    def get(self, args):
        print(args)
        data = {}
        for file in ["template.json", "params.json", "nextflow.config"]:
            try:
                data[file] = get_remote_file(args["url"], file, args["hash"])
            except NotImplementedError:
                # unknown host (not github/labmed.gitlab)
                return jsonify({})
        
        if (data["template.json"].status_code != 200) and (data["params.json"].status_code != 200):
            # if neither file could be found:            
            return jsonify({})
        out = {
            "template": get_json(data["template.json"]),
            "params": get_json(data["params.json"]),
            "config": parse_nextflow_config(data["nextflow.config"].text)
        }
        if out["template"] != {}:
            out["workflow_type"] = "template"
        elif out["params"] != {}:
            out["workflow_type"] = "params"
        else:
            out["workflow_type"] = "none"
        print(out)
        return jsonify(out)
