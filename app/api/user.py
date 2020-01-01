from flask import jsonify, current_app
from flask.views import MethodView
from flask_rest_api import Blueprint, abort

from app import db
from app.auth import get_jwt_identity, get_jwt_groups

UserApi = Blueprint(
    'UserApi', __name__,
    description='Endpoints for batchman user management.'
)


@UserApi.route('/profile')
class Profile(MethodView):
    def get(self):
        defined_workgroups = current_app.config["WORKGROUPS"].keys()
        user_groups = get_jwt_groups()
        intersection = list(set(defined_workgroups) & set(user_groups))
        workgroups = map(lambda g: {
            "display_name": current_app.config["WORKGROUPS"][g].get("DISPLAY_NAME", g), 
            "name": g,
            "default_work_dir": current_app.config["WORKGROUPS"][g].get("NEXTFLOW_S3_WORK_DIR", ""), 
        }, intersection)
        return jsonify({
            "username": get_jwt_identity(),
            "workgroups": list(workgroups)
        })

