import os
import secrets
basedir = os.path.abspath(os.path.dirname(__file__))

def get_api_key():
    # read api.key file or generate new
    try:
        with open('./api.key', 'r') as f:
            return f.read().rstrip()
    except FileNotFoundError:
        key = secrets.token_urlsafe(40) # generate 40-byte base64 encoded token
        with open('./api.key', 'w') as f:
            f.write(key)
        return key


class Config(object):
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(
        basedir, 'app.db'
    )
    OPENAPI_VERSION = '3.0.2'
    API_PREFIX = '/api/v1'

    # configure external api
    EXTERNAL_API_PREFIX = '/api/external'
    API_KEY = get_api_key()
    BATCHMAN_LOG_ENDPOINT = "https://batchman-api.labmed.uw.edu/api/external/weblog?key=%s" % API_KEY

    # ECS/Batch configuration
    ECS_CLUSTER = 'AWSBatchComputeEnvironm-35d3ca9f6f7513f_Batch_2f7e7fc2-020c-3f0e-b238-f05b6a17e74a'
    ECS_SUBNETS = ["subnet-0dd677ebd49d24d08"]
    NEXTFLOW_TASK_DEFINITION = 'nextflow-fargate-runner:2'
    NEXTFLOW_S3_TEMP = 'uwlm-personal'


class ProductionConfig(Config):
    AUTH_METHOD = 'SAML'

class DevelopmentConfig(Config):
    AUTH_METHOD = 'MOCK'
    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
