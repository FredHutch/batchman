from flask import current_app, jsonify
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
from app.common import require_apikey
from app import db

AdminApi = Blueprint(
    'AdminApi', __name__,
    description='Endpoints for admin API actions.'
)

@AdminApi.route('/apikey')
class ReceiveWeblog(MethodView):
    @AdminApi.response(code=201)
    def get(self):
        """Returns the API_KEY"""        
        return jsonify({"API_KEY": current_app.config["API_KEY"]})
