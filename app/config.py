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
    
    OPENAPI_VERSION = '3.0.2'
    API_PREFIX = '/api/v1'
    
    # configure api
    API_ENDPOINT = "http://batchman.labmed.internal"
    NEXTFLOW_TASK_DEFINITION = 'nextflow-fargate-runner:5'

    # SAML group <> resource mapping; keys correspond to ELMIRA groups.
    WORKGROUPS = {
        "u_labmed_dg_ngs-users": dict(
            DISPLAY_NAME = "NGS Analytics",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-c3c5de4c10ec3d4_Batch_7361dd51-1507-3ad0-a23e-992668a1caa0',
            ECS_SUBNETS = ["subnet-089bdabca179ab23f"],
            NEXTFLOW_S3_SCRIPTS = 's3://uwlm-nextflow-data/scripts/ngs',
            NEXTFLOW_S3_WORK_DIR = 's3://uwlm-nextflow-data/workdir/ngs',
            NEXTFLOW_S3_SESSION_CACHE = 's3://uwlm-nextflow-data/session_data/ngs',
            NEXTFLOW_DEFAULT_PROFILE = "uw_batch",
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::721970950229:role/nextflow-fargate-runner-role",
        ),
        "u_labmed_dg_molmicro": dict(
            DISPLAY_NAME = "Mol Micro",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-389d556fb4abb35_Batch_471fd548-1a2e-34ba-b9a9-5a9f5f0c1967',
            ECS_SUBNETS = ["subnet-089bdabca179ab23f"],
            NEXTFLOW_S3_SCRIPTS = 's3://uwlm-nextflow-data/scripts/molmicro',
            NEXTFLOW_S3_WORK_DIR = 's3://uwlm-nextflow-data/workdir/molmicro',
            NEXTFLOW_S3_SESSION_CACHE = 's3://uwlm-nextflow-data/session_data/molmicro',
            NEXTFLOW_DEFAULT_PROFILE = "batchman",
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::721970950229:role/nextflow-fargate-runner-role",
        )
    }

class ProductionConfig(Config):
    AUTH_METHOD = 'SAML'
    RDS_PARAMS = {
        "DBHostname": os.environ.get('DBHOST'),
        "Port": 5432,
        "DBUsername": "batchbot_user",
        "Region": "us-west-2"
    }
    SQLALCHEMY_DATABASE_URI = "postgres://"

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI= "postgresql://localhost/batchmandb"
    AUTH_METHOD = 'MOCK'
    MOCK_USERNAME = 'nkrumm'
    MOCK_GROUPS = ['u_labmed_dg_ngs-users', 'u_labmed_dg_molmicro']

    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
    OPENAPI_SWAGGER_UI_VERSION = "3.23.11"
