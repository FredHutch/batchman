from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
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

WeblogApi = Blueprint(
    'WeblogApi', __name__,
    description='Endpoint for nextflow weblog.'
)

@WeblogApi.route('/weblog')
class ReceiveWeblog(MethodView):
    @WeblogApi.arguments(NextflowWeblogSchema)
    @WeblogApi.response(code=201)
    def post(self, data):
        """Receives web log messages from nextflow"""
        e = WeblogEvent(**data)
        db.session.add(e)
        db.session.commit()
        return None