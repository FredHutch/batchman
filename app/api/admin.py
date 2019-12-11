from flask import current_app, jsonify
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
from app import db
from app.auth import get_jwt_groups

AdminApi = Blueprint(
    'AdminApi', __name__,
    description='Endpoints for admin API actions.'
)

@AdminApi.route('/apikey')
class ApiKey(MethodView):
    @AdminApi.response(code=201)
    def get(self):
        """Returns the various api keys"""
        defined_workgroups = current_app.config["WORKGROUPS"].keys()
        user_groups = get_jwt_groups()
        intersection = list(set(defined_workgroups) & set(user_groups))

        workgroups = {g: current_app.config["WORKGROUPS"][g]["API_KEY"] for g in intersection}
        return jsonify({
            "WORKGROUP_API_KEY": workgroups
        })
