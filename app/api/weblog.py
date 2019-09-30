from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
from app.common import require_apikey
from app import db

class NextflowWeblogSchema(Schema):
    class Meta:
        unknown = INCLUDE    
    runName = fields.String()
    runId = fields.String()
    event = fields.String()
    utcTime = fields.DateTime()
    metadata = fields.Mapping(attribute='metadataField') # renamed, as `metadata` is reserved in SQLAlchemy
    trace = fields.Mapping()

class ApiKeyArgs(Schema):
    key = fields.String()

WeblogApi = Blueprint(
    'WeblogApi', __name__,
    description='Endpoint for nextflow weblog.'
)

@WeblogApi.route('/weblog')
class ReceiveWeblog(MethodView):
    @WeblogApi.arguments(NextflowWeblogSchema)
    @WeblogApi.arguments(ApiKeyArgs, location='query')
    @WeblogApi.response(code=201)
    @require_apikey
    def post(self, data, query_args):
        """Receives web log messages from nextflow; requires key=API_KEY in query args"""
        e = WeblogEvent(**data)
        db.session.add(e)
        db.session.commit()
        return None