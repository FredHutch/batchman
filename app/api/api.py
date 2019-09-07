
from flask.views import MethodView
from flask_rest_api import Blueprint, abort

WorkflowApi = Blueprint(
    'WorkflowApi', __name__,
    description='Create and monitor Nextflow workflows.'
)


@WorkflowApi.route('/workflow')
class ListWorkflows(MethodView):
    def get(self):
        """List all workflows"""
        return {"msg": "hello world."}

    def post(self):
        """Submit new workflow for execution"""
        return {"msg": "hello world."}        

@WorkflowApi.route('/workflow/<string:id>')
class ListWorkflows(MethodView):
    def get(self, id ):
        """Get information on workflow by workflow id"""
        return {"msg": "hello %s" % id}



WeblogApi = Blueprint(
    'WeblogApi', __name__,
    description='Endpoint for nextflow weblog.'
)


@WeblogApi.route('/weblog')
class ReceiveWeblog(MethodView):
    def post(self):
        """Receives web log messages from nextflow"""
        return {"msg": "hello world."} 