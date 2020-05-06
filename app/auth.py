import re
import os
import base64
import json
import sqlalchemy

from functools import wraps
from flask import request, current_app, abort, jsonify, make_response

from app import db
from app.models import WorkflowExecution
def get_jwt_claims():
    if current_app.config["AUTH_METHOD"] == "MOCK":
        return {
            "username": current_app.config["MOCK_USERNAME"],
            "profile": current_app.config["MOCK_GROUPS"],
        }
    else:
        d = base64.b64decode(request.headers["x-amzn-oidc-data"].split(".")[1]).decode("utf-8")
        d = json.loads(d)
        if "profile" in d:
            d["profile"] = re.findall(r'(u_labmed_[^,\[\]]*)', d["profile"])
        else: 
            # some external users will not have any groups
            print("No `profile` found! Decoded JWT token:")
            print(d)
            d["profile"] = []
        d["username"] = d["username"].replace("UWSAML_", "")
        return d


def get_jwt_identity():
    return get_jwt_claims()["username"]

def get_jwt_groups():
    return get_jwt_claims()["profile"]

def validate_workgroup(arn_field_name='id'):
    def _validate_workgroup(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            groups = get_jwt_groups()
            arn = kwargs[arn_field_name]
            print(groups,arn)
            try:
                res = db.session.query(WorkflowExecution)\
                    .filter(WorkflowExecution.fargateTaskArn==arn)\
                    .filter(WorkflowExecution.workgroup.in_(groups))\
                    .one()
                return fn(*args, **kwargs)
            except sqlalchemy.orm.exc.NoResultFound:
                abort(make_response(jsonify(msg="Not authorized"), 403))
        return wrapper

    return _validate_workgroup

def validate_api_key(api_key):
    for workgroup, env in current_app.config["WORKGROUPS"].items():
        if api_key == env["API_KEY"]:
            return True
    else:
        return False

def get_workgroup_from_api_key(api_key):
    for workgroup, env in current_app.config["WORKGROUPS"].items():
        if api_key == env["API_KEY"]:
            return workgroup
    else:
        return None
