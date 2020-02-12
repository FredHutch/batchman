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
    
    # configure api
    # API_ENDPOINT = "http://batchman.labmed.internal"
    API_ENDPOINT = "https://dataviz-batchman.fredhutch.org"
    NEXTFLOW_TASK_DEFINITION = 'nextflow-fargate-runner:2'

    # SAML group <> resource mapping; keys correspond to ELMIRA groups.
    WORKGROUPS = {
        "u_labmed_dg_ngs-users": dict(
            DISPLAY_NAME = "NGS Analytics",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-672d4a2667efa66_Batch_6ff5e1ef-32c6-31da-8730-77547ce8f2c2',
            ECS_SUBNETS = ["subnet-002cf9908f3d76f20"],
            NEXTFLOW_S3_SCRIPTS = 's3://dataviz-bachman-nextflow-data/scripts/ngs',
            NEXTFLOW_S3_WORK_DIR = 's3://dataviz-bachman-nextflow-data/workdir/ngs',
            NEXTFLOW_S3_SESSION_CACHE = 's3://dataviz-bachman-nextflow-data/session_data/ngs',
            NEXTFLOW_DEFAULT_PROFILE = "uw_batch",
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::561666204077:role/nextflow-fargate-runner-role",
        ),
        "u_labmed_dg_molmicro": dict(
            DISPLAY_NAME = "Mol Micro",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-6a9e09cf6778f55_Batch_c30d619f-c94c-30f4-88ab-911775d59c91',
            ECS_SUBNETS = ["subnet-002cf9908f3d76f20"],
            NEXTFLOW_S3_SCRIPTS = 's3://dataviz-bachman-nextflow-data/scripts/molmicro',
            NEXTFLOW_S3_WORK_DIR = 's3://dataviz-bachman-nextflow-data/workdir/molmicro',
            NEXTFLOW_S3_SESSION_CACHE = 's3://dataviz-bachman-nextflow-data/session_data/molmicro',
            NEXTFLOW_DEFAULT_PROFILE = "batchman",
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::561666204077:role/nextflow-fargate-runner-role",
        )
    }

class ProductionConfig(Config):
    # AUTH_METHOD = 'SAML'
    AUTH_METHOD = 'MOCK'
    MOCK_USERNAME = 'dataviz'
    MOCK_GROUPS = ['u_labmed_dg_ngs-users', 'u_labmed_dg_molmicro']

    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
    OPENAPI_SWAGGER_UI_VERSION = "3.23.11"



class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI= "postgresql://@127.0.0.1/batchman"
    AUTH_METHOD = 'MOCK'
    MOCK_USERNAME = 'nkrumm'
    MOCK_GROUPS = ['u_labmed_dg_ngs-users', 'u_labmed_dg_molmicro']

    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
    OPENAPI_SWAGGER_UI_VERSION = "3.23.11"
