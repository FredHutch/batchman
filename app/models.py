from app import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON
from marshmallow_sqlalchemy import ModelSchema

# Mutable records
class WorkflowExecution(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    # first set of fields are fargate-level metadata
    fargateTaskArn = db.Column(db.String()) # renamed from nextflowRunnerArn
    fargateCreatedAt = db.Column(db.DateTime(timezone=True)) # added from AWS API call timestamp
    fargateLastStatus = db.Column(db.String()) # represents AWS Fargate status -- updated via ecs events
    fargateMetadata = db.Column(MutableDict.as_mutable(JSON)) # added from AWS API call
    fargateLogGroupName = db.Column(db.String()) # this contains the nextflow execution log
    fargateLogStreamName = db.Column(db.String()) # this contains the nextflow execution log
    cacheTaskArn = db.Column(db.String()) # fargateTaskArn of workflow used as cache (implies -resume)
    # following fields are metadata derived from nextflow weblog events
    nextflowRunName = db.Column(db.String()) # todo: consider just joining from TaskExecution?
    #nextflowRunId = db.Column(db.String())
    nextflowMetadata = db.Column(MutableDict.as_mutable(JSON)) # added with workflow execution start
    nextflowLastEvent = db.Column(db.String())
    nextflowWorkflowStartDateTime = db.Column(db.DateTime(timezone=True))
    nextflowWorkflowEndDateTime = db.Column(db.DateTime(timezone=True))
    nextflowExitStatus = db.Column(db.String())    
    nextflowIsSuccess = db.Column(db.Boolean())
    # these fields record user/batchman data
    username = db.Column(db.String()) # the UW NetId of the submitting user
    group = db.Column(db.String()) # the resource group used to submit the workflow

class WorkflowExecutionSchema(ModelSchema):
    class Meta:
        model = WorkflowExecution

class TaskExecution(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    fargateTaskArn = db.Column(db.String())
    taskArn = db.Column(db.String()) # this is the AWS Batch task ID, aka native_id from nextflow weblog data 
    taskId = db.Column(db.Integer()) # from weblog trace->task_id
    taskName = db.Column(db.String()) # from weblog trace->task name
    taskLogGroupName = db.Column(db.String()) # this contains the AWS Batch log
    taskLogStreamName = db.Column(db.String()) # this contains the AWS Batch log 
    taskLastTrace = db.Column(MutableDict.as_mutable(JSON)) # added via weblog
    taskLastEvent = db.Column(db.String()) # nextflow last event name
    taskExitCode = db.Column(db.String()) # batch/container exit code (data.container.exitCode)
    taskExitReason = db.Column(db.String()) # batch/container exit reason (data.container.reason)


class TaskExecutionSchema(ModelSchema):
    class Meta:
        model = TaskExecution

# Append-only event tables
class WeblogEvent(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    fargateTaskArn = db.Column(db.String())
    # remaining fields are directly from weblog POST data
    runName = db.Column(db.String())
    runId = db.Column(db.String())
    event = db.Column(db.String())
    utcTime = db.Column(db.DateTime(timezone=True))
    metadataField = db.Column(db.JSON())
    trace = db.Column(db.JSON())


class EcsEvent(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    # either of these may be null as some events are fargate and some AWS Batch
    fargateTaskArn = db.Column(db.String())
    taskArn = db.Column(db.String())
    # ECS event data fields
    data = db.Column(db.JSON())

