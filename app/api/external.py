from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
from app.common import require_apikey
from app import db

ExternalApi = Blueprint(
    'ExternalApi', __name__,
    description='Endpoints for nextflow weblogging, ecs logging and other externally facing endponts.'
)

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

@ExternalApi.route('/weblog')
class ReceiveWeblog(MethodView):
    @ExternalApi.arguments(NextflowWeblogSchema)
    @ExternalApi.arguments(ApiKeyArgs, location='query')
    @ExternalApi.response(code=201)
    @require_apikey
    def post(self, data, query_args):
        """Receives web log messages from nextflow; requires key=API_KEY in query args"""
        e = WeblogEvent(**data)
        db.session.add(e)
        db.session.commit()
        return None



class EcsLogSchema(Schema):
    class Meta:
        unknown = INCLUDE    

@ExternalApi.route('/weblog')
class ReceiveWeblog(MethodView):
    @ExternalApi.arguments(EcsLogSchema)
    @ExternalApi.arguments(ApiKeyArgs, location='query')
    @ExternalApi.response(code=201)
    @require_apikey
    def post(self, data, query_args):
        """
        Receives web log messages from AWS Lambdas triggered by ECS events.
        Requires key=API_KEY in query args.
        """
        print(data)
        # todo -- update Workflow records (or add new status records?)
        return None
