import sqlalchemy
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
from app.common import require_apikey
from app import db

from app.models import WorkflowRunnerExecution

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

class WeblogArgs(Schema):
    key = fields.String()
    taskArn = fields.String()

@ExternalApi.route('/weblog')
class ReceiveWeblog(MethodView):
    @ExternalApi.arguments(NextflowWeblogSchema)
    @ExternalApi.arguments(WeblogArgs, location='query')
    @ExternalApi.response(code=201)
    @require_apikey
    def post(self, data, query_args):
        """
        Receives web log messages from nextflow.
        Requires key=API_KEY and taskArn=UUID (corresponding to 
        nextflow-runner taskArn) in query args."""
        data["workflowTaskArn"] = query_args["taskArn"]
        print(data)
        e = WeblogEvent(**data)
        db.session.add(e)
        db.session.commit()
        return None


class ApiKeyArgs(Schema):
    key = fields.String()

class EcsLogSchema(Schema):
    detail_type = fields.String()
    account = fields.String()
    time = fields.DateTime()
    resources = fields.List(fields.String())
    detail = fields.Mapping()

@ExternalApi.route('/ecslog')
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

        if 'taskArn' in data['detail']:
            taskArn = data['detail']['taskArn'].split(":task/")[1]
            try:
                db_res = db.session.query(WorkflowRunnerExecution)\
                    .filter(WorkflowRunnerExecution.taskArn==taskArn).one()
            except sqlalchemy.orm.exc.NoResultFound:
                abort(404)
            if "lastStatus" in data['detail']:
                db_res.info["lastStatus"] = data['detail']["lastStatus"]
                db.session.add(db_res)
                db.session.commit()
        
        return None
        