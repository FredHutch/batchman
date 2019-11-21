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
    EXTERNAL_API_PREFIX = '/api/external'
    
    # configure api
    API_ENDPOINT = "http://batchman.labmed.internal"
    LOGGING_API_KEY = os.environ.get('API_KEY') or get_api_key()
    NEXTFLOW_TASK_DEFINITION = 'nextflow-fargate-runner:3'

    # SAML group <> resource mapping; keys correspond to ELMIRA groups.
    GROUPS = {
        "u_labmed_sec_bioinformatics": dict(
            DISPLAY_NAME = "genetics",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-23ed74f37771bd0_Batch_e03e3939-7a56-3ee8-8394-1f95f5cb3b10',
            ECS_SUBNETS = ["subnet-089bdabca179ab23f"],
            NEXTFLOW_S3_TEMP = 'uwlm-personal',
            NEXTFLOW_S3_SESSION_CACHE = 'uwlm-personal/nf_session_data',
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::721970950229:role/nextflow-fargate-runner-role",
        ),
        "u_labmed_sec_molmicro": dict(
            DISPLAY_NAME = "molmicro",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-23ed74f37771bd0_Batch_e03e3939-7a56-3ee8-8394-1f95f5cb3b10',
            ECS_SUBNETS = ["subnet-089bdabca179ab23f"],
            NEXTFLOW_S3_TEMP = 'uwlm-personal',
            NEXTFLOW_S3_SESSION_CACHE = 'uwlm-personal/nf_session_data',
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::721970950229:role/nextflow-fargate-runner-role",
        )
    }

class ProductionConfig(Config):
    AUTH_METHOD = 'SAML'

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI= "postgresql://@127.0.0.1/batchman"
    AUTH_METHOD = 'MOCK'
    MOCK_USERNAME = 'nkrumm'
    MOCK_GROUPS = ['u_labmed_mock_group']

    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
    OPENAPI_SWAGGER_UI_VERSION = "3.23.11"
