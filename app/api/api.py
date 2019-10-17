import boto3
import uuid
import urllib
import sqlalchemy
from flask import current_app, jsonify, request
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, EXCLUDE, fields

from app.models import (
    WorkflowExecution, WorkflowExecutionSchema,
    TaskExecution, TaskExecutionSchema
)
from app import db

ecs_client = boto3.client('ecs', region_name='us-west-2')
batch_client = boto3.client('batch', region_name='us-west-2')
s3_client = boto3.client('s3', region_name='us-west-2')
logs_client = boto3.client('logs', region_name='us-west-2')

class CreateWorkflowArgs(Schema):
    # The nextflow_workflow and nextflow_config fields
    # are a bit of a hack so that form data and file data can 
    # be sent via the same POST.
    # Future versions of `flask_rest_api` may more natively support this.
    class Meta:
        unknown = INCLUDE
    nextflow_version = fields.String(location="form")
    nextflow_arguments = fields.String(location="form")
    nextflow_workflow = fields.String(location="form")
    nextflow_config = fields.String(location="form")
    resume_fargate_task_arn = fields.String(location="form", required=False) # if present, will attempt to resume from prior taskArn
    # nextflow_workflow = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))
    # nextflow_config = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))


WorkflowApi = Blueprint(
    'WorkflowApi', __name__,
    description='Create and monitor Nextflow workflows.'
)

@WorkflowApi.route('/workflow')
class WorkflowList(MethodView):
    def _generate_key(self):
        return str(uuid.uuid4())

    def _upload_to_s3(self, s3_key, contents):
        res = s3_client.put_object(
            Body=contents,
            Bucket=current_app.config["NEXTFLOW_S3_TEMP"],
            Key=s3_key
        )

    @WorkflowApi.response(WorkflowExecutionSchema(many=True))
    def get(self):
        """List all workflows"""

        res = db.session.execute("""
        SELECT 
            w."fargateTaskArn", w."fargateCreatedAt", w."nextflowRunName",
            w."fargateLastStatus" as runnerTaskStatus,
            w."nextflowLastEvent" as nextflowLastEvent,
            w."nextflowMetadata"->'workflow'->'manifest' as manifest,
            task_counts."submitted_task_count",
            task_counts."running_task_count",
            task_counts."completed_task_count"
        FROM workflow_execution as w 
        LEFT JOIN (
            SELECT
                t."fargateTaskArn",
                count(t."taskLastEvent" = 'process_submitted' OR NULL) submitted_task_count,
                count(t."taskLastEvent" = 'process_started' OR NULL) running_task_count,  
                count(t."taskLastEvent" = 'process_completed' OR NULL) completed_task_count
            FROM task_execution as t
            GROUP BY t."fargateTaskArn"
        ) as task_counts
            ON task_counts."fargateTaskArn" = w."fargateTaskArn"
        ORDER BY w."fargateCreatedAt" DESC;
        """)
        res = [dict(row) for row in res]
        return jsonify(res)

    @WorkflowApi.arguments(CreateWorkflowArgs)
    @WorkflowApi.response(WorkflowExecutionSchema, code=201)
    def post(self, args):
        """Submit new workflow for execution"""
        # 1. If a workflow and config file was uploaded
        if ("nextflow_workflow" in args) and ("nextflow_config" in args):
            uuid_key = self._generate_key()
            workflow_key = "nextflow_scripts/%s/%s/main.nf" % (uuid_key[0:2], uuid_key)
            config_key = "nextflow_scripts/%s/%s/nextflow.config" % (uuid_key[0:2], uuid_key)
            self._upload_to_s3(workflow_key, args["nextflow_workflow"])
            self._upload_to_s3(config_key, args["nextflow_config"])
        # elif
        # -- GIT link provided. Probably pass to nf directly? 
        # elif
        # -- URL link; probably download and upload to s3 as above
        else:
            print(args)
            return "Invalid nextflow commands", 500
        
        if args.get("resume_fargate_task_arn", "") != "":
            # resume from prior nextflow execution
            resume_fargate_task_arn = args["resume_fargate_task_arn"]
            nextflow_options = "-resume"
        else:
            nextflow_options = ""
            resume_fargate_task_arn = ""

        nf_session_cache_dir_out = "s3://%s" % current_app.config["NEXTFLOW_S3_TEMP"]
        workflow_s3_loc = "s3://%s/%s" % (current_app.config["NEXTFLOW_S3_TEMP"], workflow_key)
        config_s3_loc = "s3://%s/%s" % (current_app.config["NEXTFLOW_S3_TEMP"], config_key)

        res = ecs_client.run_task(
            cluster=current_app.config["ECS_CLUSTER"],
            taskDefinition=current_app.config["NEXTFLOW_TASK_DEFINITION"],
            overrides={
                "containerOverrides": [
                    {
                        "name": "nextflow",
                        "command": ["runner.sh", workflow_s3_loc, config_s3_loc],
                        "environment": [
                            {
                                "name": "BATCHMAN_LOG_ENDPOINT",
                                "value": current_app.config["BATCHMAN_LOG_ENDPOINT"]
                            },
                            {
                                "name": "NEXTFLOW_OPTIONS",
                                "value": nextflow_options
                            },
                            {
                                "name": "NF_SESION_CACHE_DIR",
                                "value": current_app.config["NEXTFLOW_S3_SESSION_CACHE"]
                            },
                            {
                                "name": "NF_SESSION_CACHE_ARN",
                                "value": resume_fargate_task_arn
                            },
                        ],
                    }
                ]
            },
            launchType="FARGATE",
            networkConfiguration={
                "awsvpcConfiguration": {
                    "subnets": current_app.config["ECS_SUBNETS"],
                    "assignPublicIp": "ENABLED"
                },
            },
        )

        taskArn = res['tasks'][0]['taskArn'].split(":task/")[1]
        # save to database -- must serialize the date to string first
        infoJson = res['tasks'][0].copy()
        infoJson['createdAt'] = str(infoJson['createdAt'])

        e = WorkflowExecution(
            fargateTaskArn=taskArn,
            fargateCreatedAt=res['tasks'][0]['createdAt'],
            fargateLastStatus=res['tasks'][0]['lastStatus'],
            fargateMetadata=infoJson,
            fargateLogGroupName='/ecs/nextflow-runner',
            fargateLogStreamName='ecs/nextflow/%s' % taskArn,
        )
        db.session.add(e)
        db.session.commit()
        
        return e

@WorkflowApi.route('/workflow/<string:id>')
class Workflow(MethodView):
    @WorkflowApi.response(WorkflowExecutionSchema)
    def get(self, id ):
        """Get information on workflow by workflow id"""
        try:
            return db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn==id).one()
        except sqlalchemy.orm.exc.NoResultFound:
            abort(404)


@WorkflowApi.route('/workflow/<string:id>/logs')
class WorkflowLogs(MethodView):
    def get(self, id ):
        """Get top level workflow logs"""
        try:
            db_res = db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn==id).one()
        except sqlalchemy.orm.exc.NoResultFound:
            abort(404)

        res = logs_client.get_log_events(
            logGroupName=db_res.fargateLogGroupName,
            logStreamName=db_res.fargateLogStreamName,
            startFromHead=False
        )
        return res

@WorkflowApi.route('/workflow/<string:id>/status')
class WorkflowStatus(MethodView):
    def get(self, id):
        """Get latest workflow status"""
        abort(500)
        # res = db.session.execute("""
        #     SELECT distinct on (weblog_event."runId") * 
        #     FROM weblog_event
        #     WHERE
        #         weblog_event."workflowTaskArn" = :runId
        #         AND weblog_event."metadataField" is not null
        #     ORDER BY weblog_event."runId", id desc;
        # """, {'runId': id})
        # res = [dict(row) for row in res]
        # return jsonify(res[0])


@WorkflowApi.route('/workflow/<string:id>/tasks')
class WorkflowTasks(MethodView):
    @WorkflowApi.response(TaskExecutionSchema(many=True))
    def get(self, id):
        """Get tasks for workflow"""
        return db.session.query(TaskExecution)\
            .filter(TaskExecution.fargateTaskArn==id)\
            .all()


@WorkflowApi.route('/workflow/<string:id>/script')
@WorkflowApi.route('/workflow/<string:id>/config')
class WorkflowScriptFile(MethodView):
    def get(self, id):
        """Get nextflow script for workflow"""
        FILE = request.path.split("/")[-1]
        try:
            db_res = db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn==id).one()
            if FILE == "script":
                s3_url = db_res.fargateMetadata["detail"]["overrides"]["containerOverrides"][0]["command"][1]
            elif FILE == "config":
                s3_url = db_res.fargateMetadata["detail"]["overrides"]["containerOverrides"][0]["command"][2]
            else:
                abort(500)
        except sqlalchemy.orm.exc.NoResultFound:
            abort(404)
        p = urllib.parse.urlparse(s3_url)
        res = s3_client.get_object(Bucket=p.netloc, Key=p.path[1:])
        return jsonify({"contents": res['Body'].read().decode('utf-8')})


@WorkflowApi.route('/workflow/<string:run_id>/tasks/<string:task_id>')
class WorkflowTaskStatus(MethodView):
    @WorkflowApi.response(TaskExecutionSchema)
    def get(self, run_id, task_id):
        """Get all status updates for specific task of workflow"""
        return db.session.query(TaskExecution)\
            .filter(TaskExecution.fargateTaskArn==run_id)\
            .filter(TaskExecution.taskId==task_id)\
            .one()


@WorkflowApi.route('/workflow/<string:run_id>/tasks/<string:task_id>/logs')
class WorkflowTaskLogs(MethodView):
    def get(self, run_id, task_id):
        """Get logs for specific task"""
        db_res = db.session.query(TaskExecution)\
            .filter(TaskExecution.fargateTaskArn==run_id)\
            .filter(TaskExecution.taskId==task_id)\
            .one()

        res = logs_client.get_log_events(
            logGroupName=db_res.taskLogGroupName,
            logStreamName=db_res.taskLogStreamName,
            startFromHead=False
        )
        return res

