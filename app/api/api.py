import boto3
import uuid
from flask import current_app
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
from marshmallow import Schema, INCLUDE, EXCLUDE, fields

ecs_client = boto3.client('ecs', region_name='us-west-2')
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
    # nextflow_workflow = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))
    # nextflow_config = fields.Function(location="files", deserialize=lambda x: x.read().decode("utf-8"))


class CreateWorkflowReturn(Schema):
    class Meta:
        unknown = EXCLUDE
    taskArn = fields.String()
    taskLastStatus = fields.String()
    containerLastStatus = fields.String()

WorkflowApi = Blueprint(
    'WorkflowApi', __name__,
    description='Create and monitor Nextflow workflows.'
)

@WorkflowApi.route('/workflow')
class ListWorkflows(MethodView):
    def _generate_key(self):
        return str(uuid.uuid4())

    def _upload_to_s3(self, s3_key, contents):
        res = s3_client.put_object(
            Body=contents,
            Bucket=current_app.config["NEXTFLOW_S3_TEMP"],
            Key=s3_key
        )

    def get(self):
        """List all workflows"""
        return {"msg": "hello world."}

    @WorkflowApi.arguments(CreateWorkflowArgs)
    @WorkflowApi.response(code=201)
    def post(self, args):
        """Submit new workflow for execution"""
        
        # 1. If a workflow and config file was uploaded
        if ("nextflow_workflow" in args) and ("nextflow_config" in args):
            uuid_key = self._generate_key()
            workflow_key = "nextflow_scripts/%s/main.nf" % uuid_key
            config_key = "nextflow_scripts/%s/nextflow.config" % uuid_key
            self._upload_to_s3(workflow_key, args["nextflow_workflow"])
            self._upload_to_s3(config_key, args["nextflow_config"])
        # elif
        # -- GIT link provided. Probably pass to nf directly? 
        # elif
        # -- URL link; probably download and upload to s3 as above
        else:
            print(args)
            return "Invalid nextflow commands", 500
        
        print(workflow_key, config_key)
        workflow_s3_loc = "s3://%s/%s" % (current_app.config["NEXTFLOW_S3_TEMP"], workflow_key)
        config_s3_loc = "s3://%s/%s" % (current_app.config["NEXTFLOW_S3_TEMP"], config_key)
        weblog_endpoint = "https://batchman-api.labmed.uw.edu/api/v1/weblog?key=%s" % current_app.config["API_KEY"]
        res = ecs_client.run_task(
            cluster=current_app.config["ECS_CLUSTER"],
            taskDefinition=current_app.config["NEXTFLOW_TASK_DEFINITION"],
            overrides={
                "containerOverrides": [
                    {
                        "name": "nextflow",
                        "command": ["runner.sh", workflow_s3_loc, config_s3_loc],
                        "environment": [{
                            "name": "BATCHMAN_LOG_ENDPOINT",
                            "value": weblog_endpoint
                        }],
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

        taskArn = res['tasks'][0]['taskArn']
        taskLastStatus = res['tasks'][0]['lastStatus']
        containerLastStatus = res['tasks'][0]['containers'][0]['lastStatus']

        return {
            "taskArn": taskArn,
            "taskLastStatus": taskLastStatus,
            "containerLastStatus": containerLastStatus,
        }

@WorkflowApi.route('/workflow/<string:id>')
class ListWorkflows(MethodView):
    def get(self, id ):
        """Get information on workflow by workflow id"""
        res = ecs_client.describe_tasks(
            cluster=current_app.config["ECS_CLUSTER"],
            tasks=[id]
        )
        return res


@WorkflowApi.route('/workflow/<string:id>/logs')
class WorkflowLogs(MethodView):
    def get(self, id ):
        """Get top level workflow logs"""
        res = logs_client.get_log_events(
            logGroupName='/ecs/nextflow-runner',
            logStreamName="ecs/nextflow/%s" % id,
            startFromHead=False
        )
        return res

