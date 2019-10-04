from app import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON

# class MyModel(db.Model):
#     id = db.Column(db.BigInteger(), primary_key=True)

class WeblogEvent(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    runName = db.Column(db.String())
    runId = db.Column(db.String())
    event = db.Column(db.String())
    utcTime = db.Column(db.DateTime())
    metadataField = db.Column(db.JSON())
    trace = db.Column(db.JSON())

class WorkflowRunnerExecution(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    taskArn = db.Column(db.String())
    createdAt = db.Column(db.DateTime())
    info = db.Column(MutableDict.as_mutable(JSON))

