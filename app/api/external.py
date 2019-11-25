import pprint
import sqlalchemy
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, fields

from app.models import WeblogEvent
from app.auth import require_logging_apikey
from app import db

from app.models import WorkflowExecution, TaskExecution, EcsEvent, WeblogEvent

ExternalApi = Blueprint(
    'ExternalApi', __name__,
    description='Endpoints for nextflow weblogging, ecs logging and other externally facing endponts.'
)

pp = pprint.PrettyPrinter(indent=4)

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
    @require_logging_apikey
    def post(self, data, query_args):
        """
        Receives web log messages from nextflow.
        Requires key=API_KEY and taskArn=UUID (corresponding to 
        nextflow-runner taskArn) in query args."""
        fargateTaskArn = query_args["taskArn"]

        # First, save event in WeblogEvent table
        data["fargateTaskArn"] = fargateTaskArn
        e = WeblogEvent(**data)
        db.session.add(e)
        print("### received weblog event from nf ###")
        pp.pprint(data)
        print("###########################")

        if data["event"] in ["started", "completed"]:
            # update WorkflowExecution (this record will already have been created)
            w = db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn == fargateTaskArn)\
                .one()

            w.nextflowRunName = data["metadataField"]["workflow"]["runName"]
            w.nextflowMetadata = data["metadataField"]

            if data["metadataField"]["workflow"]["errorMessage"] != None:
                # override to "error", even though this isn't strictly the event name
                w.nextflowLastEvent = "error"
            else:
                w.nextflowLastEvent = data["event"]

            if data["event"] == "started":
                w.nextflowWorkflowStartDateTime = data["utcTime"]
            else:
                w.nextflowWorkflowEndDateTime = data["utcTime"]
            
            w.nextflowExitStatus = data["metadataField"]["workflow"]["exitStatus"]
            w.nextflowIsSuccess = data["metadataField"]["workflow"]["success"]
            
        elif data["event"] in ["process_submitted", "process_started", "process_completed"]:
            # then create or update TaskExecution
            taskArn = data["trace"]["native_id"]
            try:
                t = db.session.query(TaskExecution)\
                    .filter(TaskExecution.fargateTaskArn == fargateTaskArn)\
                    .filter(TaskExecution.taskArn == taskArn)\
                    .one()
            except sqlalchemy.orm.exc.NoResultFound: 
                # create new record
                t = TaskExecution(
                    fargateTaskArn = fargateTaskArn,
                    taskArn = taskArn,
                    taskId = data["trace"]["task_id"],
                    taskName = data["trace"]["name"]
                )
                db.session.add(t)

            # update remaining fields
            t.taskLastTrace = data["trace"]
            t.taskLastEvent = data["event"]
        elif data["event"] == "error":
            # do nothing with this event, as it will be followed by a "completed" event 
            # with failure information. (this event is just a stub)
            pass

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
    def parse_event_type(self, data):
        if "detail" in data:
            if data["detail"].get("jobQueue", "").startswith("arn:aws:batch"):
                return "BATCH_JOB_EVENT"
            elif data["detail"].get("launchType") == "FARGATE":
                return "FARGATE_EVENT"
        return None

    @ExternalApi.arguments(EcsLogSchema)
    @ExternalApi.arguments(ApiKeyArgs, location='query')
    @ExternalApi.response(code=201)
    @require_logging_apikey
    def post(self, data, query_args):
        """
        Receives web log messages from AWS Lambdas triggered by ECS events.
        Requires key=API_KEY in query args.
        """
        event_type = self.parse_event_type(data)
        print("### received %s ###" % event_type)
        pp.pprint(data)
        print("###########################")

        if event_type == "BATCH_JOB_EVENT":
            taskArn = data['detail']['jobId']

            # save event with taskArn
            e = EcsEvent(
                taskArn=taskArn,
                data=data
            )
            db.session.add(e)
            
            # save task details to mutable TaskExecution record
            containerData = data['detail']['container']
            
            try:
                t = db.session.query(TaskExecution)\
                    .filter(TaskExecution.taskArn==taskArn).one()
            except sqlalchemy.orm.exc.NoResultFound:
                abort(404)

            # update logStreamName if present
            logStreamName = containerData.get("logStreamName")
            if logStreamName and (t.taskLogGroupName is None):
                t.taskLogGroupName = '/aws/batch/job'
                t.taskLogStreamName = logStreamName

            # update exit status/reason
            if containerData.get('exitCode') or containerData.get('reason'):
                t.taskExitCode = containerData.get('exitCode')
                t.taskExitReason = containerData.get('reason')
            
            db.session.add(t)

        elif event_type == 'FARGATE_EVENT':
            fargateTaskArn = data['detail']['taskArn'].split(":task/")[1]
            
            e = EcsEvent(
                fargateTaskArn=fargateTaskArn,
                data=data
            )
            db.session.add(e)

            try:
                w = db.session.query(WorkflowExecution)\
                    .filter(WorkflowExecution.fargateTaskArn==fargateTaskArn).one()
            except sqlalchemy.orm.exc.NoResultFound:
                abort(404)
            
            # update fargate status field of WorkflowExecution
            if "lastStatus" in data['detail']:
                w.fargateLastStatus = data['detail']["lastStatus"]

            # update metadata
            w.fargateMetadata = data

            # save to db
            db.session.add(w)
        else:
            # other type of event
            pass
        
        # commit updates and event record
        db.session.commit()
