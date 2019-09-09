from app import db

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
