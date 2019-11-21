import re
import os
import base64
import json
from functools import wraps
from flask import request, current_app, abort

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

def validate_api_key(fargateTaskArn, api_key):
    try:
        t = db.session.query(TaskExecution)\
            .filter(TaskExecution.taskArn==taskArn).one()
    except sqlalchemy.orm.exc.NoResultFound:
        abort(404)

    if t.group == get_group_by_key(api_key):
        return true
    else:
        return false

# from https://coderwall.com/p/4qickw/require-an-api-key-for-a-route-in-flask-using-only-a-decorator
def require_logging_apikey(view_function):
    @wraps(view_function)
    def decorated_function(*args, **kwargs):
        if request.args.get('key') and request.args.get('key') == current_app.config["LOGGING_API_KEY"]:
            return view_function(*args, **kwargs)
        else:
            abort(401)
    return decorated_function