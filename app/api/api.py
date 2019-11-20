import boto3
import botocore
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

from app.auth import get_jwt_identity

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
    nextflow_version = fields.String(location="json")
    nextflow_arguments = fields.String(location="json")
    nextflow_workflow = fields.String(location="json")
    nextflow_config = fields.String(location="json")
    resume_fargate_task_arn = fields.String(location="json", required=False) # if present, will attempt to resume from prior taskArn
    # nextflow_workflow = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))
    # nextflow_config = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))
    group = fields.String(location="json", required=True)

class ListWorkflowArgs(Schema):
    status = fields.String(location="query")
    username = fields.String(location="query")

WorkflowApi = Blueprint(
    'WorkflowApi', __name__,
    description='Create and monitor Nextflow workflows.'
)

@WorkflowApi.route('/workflow')
class WorkflowList(MethodView):
    def _generate_key(self):
        return str(uuid.uuid4())

    def _upload_to_s3(self, bucket, s3_key, contents):
        res = s3_client.put_object(
            Body=contents,
            Bucket=bucket,
            Key=s3_key
        )

    @WorkflowApi.arguments(ListWorkflowArgs)
    @WorkflowApi.response(WorkflowExecutionSchema(many=True))
    def get(self, args):
        """List all workflows"""
        sql = ["""
        SELECT 
            w."fargateTaskArn", w."fargateCreatedAt", w."nextflowRunName",
            w."fargateLastStatus" as runnerTaskStatus,
            w."nextflowLastEvent" as nextflowLastEvent,
            w."nextflowMetadata"->'workflow'->'manifest' as manifest,
            w."cacheTaskArn", 
            w."username",
            w."group",
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
        """]
        where_statements = []
        where_args = {}
        if "username" in args:
            where_statements += ['w."username" = :username']
            if args["username"] == "me":
                where_args["username"] = get_jwt_identity()
            else:
                where_args["username"] = args["username"]
        if "status" in args:
            where_statements += ['w."nextflowLastEvent" = :status']
            where_args["status"] = args["status"]

        if len(where_statements) > 0:
            sql += ["WHERE"]
            sql.extend(where_statements)
        sql += ['ORDER BY w."fargateCreatedAt" DESC;']
        print (where_args)
        res = db.session.execute("\n".join(sql), where_args)
        res = [dict(row) for row in res]
        return jsonify(res)

    @WorkflowApi.arguments(CreateWorkflowArgs)
    @WorkflowApi.response(WorkflowExecutionSchema, code=201)
    def post(self, args):
        """Submit new workflow for execution"""
        # 0. define execution environment variables
        if ("group" not in args) or (args["group"] not in current_app.config["GROUPS"]):
            return "Must specify a valid `group` in POST", 500
        else:
            # TODO: validate user <> group relationship
            GROUP = args["group"]
            env = current_app.config["GROUPS"][GROUP]

        # 1. If a workflow and config file was uploaded
        print(args)
        if ("nextflow_workflow" in args) and ("nextflow_config" in args):
            uuid_key = self._generate_key()
            workflow_key = "nextflow_scripts/%s/%s/main.nf" % (uuid_key[0:2], uuid_key)
            config_key = "nextflow_scripts/%s/%s/nextflow.config" % (uuid_key[0:2], uuid_key)
            try:
                self._upload_to_s3(env["NEXTFLOW_S3_TEMP"], workflow_key, args["nextflow_workflow"])
                self._upload_to_s3(env["NEXTFLOW_S3_TEMP"], config_key, args["nextflow_config"])
            except botocore.exceptions.ClientError:
                return jsonify({"error": "unable to save scripts"}), 500
        # elif
        # -- GIT link provided. Probably pass to nf directly? 
        # elif
        # -- URL link; probably download and upload to s3 as above
        else:
            print(args)
            return "Invalid nextflow commands", 500
        
        nextflow_options = ["-with-trace"]
        if args.get("resume_fargate_task_arn", "") != "":
            # resume from prior nextflow execution
            # TODO: ensure this arn was run as part of current group
            resume_fargate_task_arn = args["resume_fargate_task_arn"]
            nextflow_options.append("-resume")
        else:
            resume_fargate_task_arn = ""

        workflow_s3_loc = "s3://%s/%s" % (env["NEXTFLOW_S3_TEMP"], workflow_key)
        config_s3_loc = "s3://%s/%s" % (env["NEXTFLOW_S3_TEMP"], config_key)
        nf_session_loc = "s3://" + env["NEXTFLOW_S3_SESSION_CACHE"]
        try:
            res = ecs_client.run_task(
                cluster=env["ECS_CLUSTER"],
                taskDefinition=current_app.config["NEXTFLOW_TASK_DEFINITION"],
                taskRoleArn=env["IAM_TASK_ROLE_ARN"],
                overrides={
                    "containerOverrides": [
                        {
                            "name": "nextflow",
                            "command": ["runner.sh", workflow_s3_loc, config_s3_loc],
                            "environment": [
                                {
                                    "name": "API_ENDPOINT",
                                    "value": current_app.config["API_ENDPOINT"]
                                },
                                {
                                    "name": "API_KEY",
                                    "value": env["API_KEY"]
                                },
                                {
                                    "name": "NEXTFLOW_OPTIONS",
                                    "value": " ".join(nextflow_options)
                                },
                                {
                                    "name": "NF_SESSION_CACHE_DIR",
                                    "value": nf_session_loc
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
                        "subnets": env["ECS_SUBNETS"],
                        "assignPublicIp": "ENABLED"
                    },
                },
            )
        except botocore.exceptions.ClientError:
            return jsonify({"error": "unable to launch job"}), 500

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
            cacheTaskArn=resume_fargate_task_arn,
            username=get_jwt_identity(),
            group=GROUP,
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

    def delete(self, id):
        """Stop workflow by workflow id"""
        try:
            res = ecs_client.stop_task(
                cluster=current_app.config["ECS_CLUSTER"],
                task=id,
                reason="Task stopped by user (%s)" % get_jwt_identity()
            )
            return jsonify({"msg": "ok"})
        except botocore.exceptions.ClientError:
            return jsonify({"error": "unable to delete workflow"}), 500


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

