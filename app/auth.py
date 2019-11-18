import re
import os
import base64
import json
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
