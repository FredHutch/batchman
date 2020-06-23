from flask import current_app, jsonify
from flask.views import MethodView
from flask_rest_api import Blueprint, abort
import marshmallow as m # import Schema, INCLUDE, fields

from app.api.groovy_config_parser import GroovyConfigSlurper

from schema import Schema, And, Use, Optional, SchemaError


ActionsApi = Blueprint(
    'ActionsApi', __name__,
    description='Endpoints for API methods not associated with `arn`.'
)


class NextflowConfigParseArgs(m.Schema):
    class Meta:
        unknown = m.INCLUDE
    nextflow_config = m.fields.String(location="json")


valid_schema = Schema({
    'workDir': And(Use(str), lambda s: s.startswith("s3://")),
    'process': {
        'scratch': '/docker_scratch',
        'queue': And(Use(str)),
        'executor': 'awsbatch',
        Optional('container'): And(Use(str))
    },
    'aws': {
        'region': 'us-west-2',
        'batch': {
            'volumes': '/docker_scratch',
            'cliPath': '/home/ec2-user/miniconda/bin/aws'
        }
    }
});


@ActionsApi.route('/parse_nextflow_config')
class NextflowConfigParse(MethodView):
    @ActionsApi.arguments(NextflowConfigParseArgs)
    def post(self, args):
        print(args["nextflow_config"])
        config = GroovyConfigSlurper(args["nextflow_config"]).parse()
        print(config)
        valid_profiles = []
        errors = []
        for name, p in config["profiles"].items():
            try:
                valid_schema.validate(p)
                valid_profiles.append(name)
            except SchemaError as e:
                errors.append({name: str(e)})
                
        return jsonify({
            "config": config,
            "valid_profiles": valid_profiles,
            "errors": errors
        })
