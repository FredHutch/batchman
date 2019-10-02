import sys
import os
import flask_rest_api
import flask_sqlalchemy
import flask_migrate

from flask import Flask, make_response, redirect, send_from_directory, jsonify, request, current_app, render_template


## Initialize these objects here
# so they are accessible by `from app import db`
db = flask_sqlalchemy.SQLAlchemy()
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
    from app.models import WeblogEvent

    ## Serve static files in production
    # @app.route('/', defaults={'path': ''})
    # @app.route('/<path:path>')
    # def serve(path):
    #     if path != "" and os.path.exists("/app/build/" + path):
    #         return send_from_directory('build', path)
    #     else:
    #         return send_from_directory('build', 'index.html')

    @app.route("/")
    def home():
        return """
            <h2>Batchman submit job</h2>
            <form action="/api/v1/workflow" method="post">
                <textarea name="nextflow_workflow" rows=50 cols=100>Paste main.nf file here</textarea>
                <textarea name="nextflow_config" rows=50 cols=100>Paste nextflow.config here</textarea>
                <input type="submit" />
            </form>
        """
    ## API setup
    apis = flask_rest_api.Api(app)
    
    from app.api import api, weblog
    apis.register_blueprint(api.WorkflowApi, url_prefix=app.config["API_PREFIX"])
    apis.register_blueprint(weblog.WeblogApi, url_prefix=app.config["API_PREFIX"])

    return app