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

from app.auth import get_jwt_identity, get_jwt_groups, validate_workgroup

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
    nextflow_params = fields.String(location="json")
    nextflow_profile = fields.String(location="json")
    git_url = fields.String(location="json")
    git_hash = fields.String(location="json")
    resume_fargate_task_arn = fields.String(location="json", required=False) # if present, will attempt to resume from prior taskArn
    # nextflow_workflow = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))
    # nextflow_config = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))
    workgroup = fields.String(location="json", required=True)

class ListWorkflowArgs(Schema):
    status = fields.String(location="query")
    username = fields.String(location="query")
    workgroup = fields.String(location="query")

WorkflowApi = Blueprint(
    'WorkflowApi', __name__,
    description='Create and monitor Nextflow workflows.'
)

@WorkflowApi.route('/workflow')
class WorkflowList(MethodView):
    def _generate_key(self):
        return str(uuid.uuid4())

    def _upload_to_s3(self, s3_url, contents):
        p = urllib.parse.urlparse(s3_url)
        res = s3_client.put_object(
            Body=contents,
            Bucket=p.netloc,
            Key=p.path[1:]
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
            w."workgroup",
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
        where_statements = ['w."workgroup" = any(:workgroup_list)']
        where_args = {"workgroup_list": get_jwt_groups()}
        if "username" in args:
            where_statements += ['w."username" = :username']
            if args["username"] == "me":
                where_args["username"] = get_jwt_identity()
            else:
                where_args["username"] = args["username"]
        if "workgroup" in args:
            where_statements += ['w."workgroup" = :workgroup']
            where_args["workgroup"] = args["workgroup"]
        if "status" in args:
            where_statements += ['w."nextflowLastEvent" = :status']
            where_args["status"] = args["status"]

        if len(where_statements) > 0:
            sql += ["WHERE"]
            sql.extend([" AND ".join(where_statements)])
        sql += ['ORDER BY w."fargateCreatedAt" DESC;']
        res = db.session.execute("\n".join(sql), where_args)
        res = [dict(row) for row in res]
        return jsonify(res)

    @WorkflowApi.arguments(CreateWorkflowArgs)
    @WorkflowApi.response(WorkflowExecutionSchema, code=201)
    def post(self, args):
        """Submit new workflow for execution"""
        # 0. define execution environment variables
        if ("workgroup" not in args) or (args["workgroup"] not in current_app.config["WORKGROUPS"]):
            return jsonify({"error": "Must specify a valid `workgroup` in POST"}), 500
        else:
            WORKGROUP = args["workgroup"]
            if WORKGROUP not in get_jwt_groups():
                return jsonify({"error": "User is not part of group"}), 401
            else:
                env = current_app.config["WORKGROUPS"][WORKGROUP]

        nextflow_options = ["-with-trace"]
        additional_env_vars = []
        uuid_key = self._generate_key()

        if ("nextflow_workflow" in args) and ("nextflow_config" in args):
            # 1a. If a workflow and config file was uploaded    
            workflow_loc =  "%s/%s/%s/main.nf" % (env["NEXTFLOW_S3_SCRIPTS"], uuid_key[0:2], uuid_key)
            config_loc = "%s/%s/%s/nextflow.config" % (env["NEXTFLOW_S3_SCRIPTS"], uuid_key[0:2], uuid_key)
            try:
                self._upload_to_s3(workflow_loc, args["nextflow_workflow"])
                self._upload_to_s3(config_loc, args["nextflow_config"])
            except botocore.exceptions.ClientError:
                return jsonify({"error": "unable to save scripts"}), 500
            execution_type = "FILES"
            command = ["runner.sh", workflow_loc, config_loc]
        elif ("git_url" in args):
            # 1b. Or, if a git url is provided
            execution_type = "GIT_URL"
            if "git_hash" in args:
                nextflow_options.append("-r " + args["git_hash"])
            command = ["runner.sh", args["git_url"]]
        elif ("s3_url" in args):
            # 1c. Or, a s3 url
            execution_type = "S3_URL"
            command = ["runner.sh", args["s3_url"]]
        else:
            print(args)
            return jsonify({"error": "Invalid nextflow commands"}), 500
        
        if args.get("nextflow_params", "") != "":
            # upload params_file to S3 if provided. Runner.sh downloads this.
            params_file_loc = "%s/%s/%s/params.json" % (env["NEXTFLOW_S3_SCRIPTS"], uuid_key[0:2], uuid_key)
            try:
                self._upload_to_s3(params_file_loc, args["nextflow_params"])
            except botocore.exceptions.ClientError:
                return jsonify({"error": "unable to save params file."}), 500
            nextflow_options.append("-params-file params.json")
            additional_env_vars.append({"name": "NF_PARAMS_FILE", "value": params_file_loc})
        
        if args.get("nextflow_profile", "") != "":
            nextflow_options.append("-profile " + args["nextflow_profile"])

        if args.get("resume_fargate_task_arn", "") != "":
            # resume from prior nextflow execution
            resume_fargate_task_arn = args["resume_fargate_task_arn"]
            # ensure this arn was run as part of current group
            try:
                w = db.session.query(WorkflowExecution)\
                    .filter(WorkflowExecution.fargateTaskArn==resume_fargate_task_arn).one()
            except sqlalchemy.orm.exc.NoResultFound:
                abort(404)
            if w.workgroup != WORKGROUP:
                return jsonify({"error": "You can only resume from workflows in the same workgroup"}), 401
            nextflow_options.append("-resume")
            additional_env_vars.append({"name": "NF_SESSION_CACHE_ARN", "value": resume_fargate_task_arn})
        else:
            resume_fargate_task_arn = ""

        try:
            res = ecs_client.run_task(
                cluster=env["ECS_CLUSTER"],
                taskDefinition=current_app.config["NEXTFLOW_TASK_DEFINITION"],
                overrides={
                    "taskRoleArn": env["IAM_TASK_ROLE_ARN"],
                    "containerOverrides": [
                        {
                            "name": "nextflow",
                            "command": command,
                            "environment": [
                                {
                                    "name": "EXECUTION_TYPE",
                                    "value": execution_type
                                },
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
                                    "value": env["NEXTFLOW_S3_SESSION_CACHE"]
                                },
                                *additional_env_vars
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
        except botocore.exceptions.ClientError as e:
            return jsonify({"error": "unable to launch job", "msg": e}), 500

        taskArn = res['tasks'][0]['taskArn'].split(":task/")[1]
        # save to database -- must serialize the date to string first
        infoJson = res['tasks'][0].copy()
        infoJson['createdAt'] = str(infoJson['createdAt'])
        launchMetadataJson = {
            "execution_type": execution_type, # FILES | GIT_URL
            "execution_source": "WEB", # TODO: could be lambda, api, etc?
            "git_url": git_url,
            "git_hash": git_hash,
            "nextflow_profile": nextflow_profile,
            "params_loc": params_file_loc,
            "workflow_loc": workflow_loc,
            "config_loc": config_loc,
        }
        e = WorkflowExecution(
            fargateTaskArn=taskArn,
            fargateCreatedAt=res['tasks'][0]['createdAt'],
            fargateLastStatus=res['tasks'][0]['lastStatus'],
            fargateMetadata=infoJson,
            fargateLogGroupName='/ecs/nextflow-runner',
            fargateLogStreamName='ecs/nextflow/%s' % taskArn,
            cacheTaskArn=resume_fargate_task_arn,
            username=get_jwt_identity(),
            workgroup=WORKGROUP,
            launchMetadata=launchMetadataJson,
        )
        db.session.add(e)
        db.session.commit()
        
        return e

@WorkflowApi.route('/workflow/<string:id>')
class Workflow(MethodView):
    @WorkflowApi.response(WorkflowExecutionSchema)
    @validate_workgroup()
    def get(self, id):
        """Get information on workflow by workflow id"""
        try:
            return db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn==id)\
                .filter(WorkflowExecution.workgroup.in_(get_jwt_groups()))\
                .one()
        except sqlalchemy.orm.exc.NoResultFound:
            abort(404)

    @validate_workgroup()
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
    @validate_workgroup()
    def get(self, id ):
        """Get top level workflow logs"""
        try:
            db_res = db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn==id)\
                .filter(WorkflowExecution.workgroup.in_(get_jwt_groups()))\
                .one()
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
    @validate_workgroup()
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
    @validate_workgroup()
    def get(self, id):
        """Get tasks for workflow"""
        return db.session.query(TaskExecution)\
            .filter(TaskExecution.fargateTaskArn==id)\
            .all()


@WorkflowApi.route('/workflow/<string:id>/script')
@WorkflowApi.route('/workflow/<string:id>/config')
@WorkflowApi.route('/workflow/<string:id>/params')
class WorkflowScriptFile(MethodView):
    @validate_workgroup()
    def get(self, id):
        """Get nextflow script for workflow"""
        FILE = request.path.split("/")[-1]
        try:
            db_res = db.session.query(WorkflowExecution)\
                .filter(WorkflowExecution.fargateTaskArn==id).one()
            if FILE == "script":
                s3_url = db_res.launchMetadata["workflow_loc"]
            elif FILE == "config":
                s3_url = db_res.launchMetadata["config_loc"]
            elif FILE == "params":
                s3_url = db_res.launchMetadata["params_loc"]
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
    @validate_workgroup(arn_field_name='run_id')
    def get(self, run_id, task_id):
        """Get all status updates for specific task of workflow"""
        return db.session.query(TaskExecution)\
            .filter(TaskExecution.fargateTaskArn==run_id)\
            .filter(TaskExecution.taskId==task_id)\
            .one()


@WorkflowApi.route('/workflow/<string:run_id>/tasks/<string:task_id>/logs')
class WorkflowTaskLogs(MethodView):
    @validate_workgroup(arn_field_name='run_id')
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


