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
        defined_groups = current_app.config["WORKGROUPS"]
        user_groups = get_jwt_groups()
        intersection = list(set(defined_groups) & set(defined_groups))
        if len(intersection) == 0:
            return jsonify({})
        else:
            workgroups = map(lambda g: {
                "display_name": defined_groups[g].get("DISPLAY_NAME", g), 
                "name": g
            }, intersection)
            return jsonify({
                "username": get_jwt_identity(),
                "workgroups": list(workgroups)
            })

