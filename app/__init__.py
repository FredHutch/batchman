import sys
import os
import flask_rest_api
import flask_sqlalchemy
import flask_migrate

from flask import Flask, make_response, redirect, send_from_directory, jsonify, request, current_app, render_template, json


## Initialize these objects here
# so they are accessible by `from app import db`
db = flask_sqlalchemy.SQLAlchemy(
    engine_options={"json_serializer": json.dumps} # use flask json to help serialize
)
migrate = flask_migrate.Migrate()

## Init and Config
def create_app():
    app = Flask(__name__, static_folder="build")

    if os.environ.get('FLASK_ENV') == 'development':
        app.config.from_object('app.config.DevelopmentConfig')
    else:
        app.config.from_object('app.config.ProductionConfig')
    
    ## Database
    db.init_app(app)
    migrate.init_app(app, db)
    
    ## Import models so flask-migrate can see
    from app.models import WorkflowExecution, TaskExecution, WeblogEvent, EcsEvent

    @app.route("/api/submit")
    def home():
        task_arns = db.session.query(WorkflowExecution.fargateTaskArn).all()
        options = ["<option value='%s'>%s</option>" % (i[0], i[0]) for i in task_arns]
        return """
            <h2>Batchman submit job</h2>
            <form action="/api/v1/workflow" method="post">
                <textarea name="nextflow_workflow" rows=50 cols=100>Paste main.nf file here</textarea>
                <textarea name="nextflow_config" rows=50 cols=100>Paste nextflow.config here</textarea>
                <br/>
                <h4>Resume options</h4>
                <select name="resume_fargate_task_arn">
                  <option value="">No resume</option>
                  %s
                </select>
                <br/><br/><br/>
                <input type="submit" />
            </form>
        """ % ("\n".join(options))

    # Serve static files in production
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists("/app/build/" + path):
            return send_from_directory('build', path)
        else:
            return send_from_directory('build', 'index.html')

    
    ## API setup
    apis = flask_rest_api.Api(app)
    
    from app.api import api, external, admin
    apis.register_blueprint(api.WorkflowApi, url_prefix=app.config["API_PREFIX"])
    apis.register_blueprint(admin.AdminApi, url_prefix=app.config["API_PREFIX"])
    # Note: this route is NOT TO BE PROTECTED at the ALB level as it enforces an API_KEY for each route
    apis.register_blueprint(external.ExternalApi, url_prefix=app.config["EXTERNAL_API_PREFIX"])

    return app
