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
    API_ENDPOINT = "https://batchman-dev.fredhutch.org"
    NEXTFLOW_TASK_DEFINITION = 'nextflow-fargate-runner:2'

    # SAML group <> resource mapping; keys correspond to ELMIRA groups.
    WORKGROUPS = {
        "u_labmed_dg_ngs-users": dict(
            DISPLAY_NAME = "NGS Analytics",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-d4faaf96c22c48e_Batch_2e857809-78e4-355e-a34b-5e46bf37a749',
            ECS_SUBNETS = ["subnet-00ac5a63e10167776"],
            NEXTFLOW_S3_SCRIPTS = 's3://fredhutch-nextflow-data/scripts/ngs',
            NEXTFLOW_S3_WORK_DIR = 's3://fredhutch-nextflow-data/workdir/ngs',
            NEXTFLOW_S3_SESSION_CACHE = 's3://fredhutch-nextflow-data/session_data/ngs',
            NEXTFLOW_DEFAULT_PROFILE = "uw_batch",
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::431561177764:role/nextflow-fargate-runner-role",
        ),
        "u_labmed_dg_molmicro": dict(
            DISPLAY_NAME = "Mol Micro",
            ECS_CLUSTER = 'AWSBatchComputeEnvironm-85ec7c556398afa_Batch_34cd0b72-26b1-3ca0-b789-5d850371d58a',
            ECS_SUBNETS = ["subnet-00ac5a63e10167776"],
            NEXTFLOW_S3_SCRIPTS = 's3://fredhutch-nextflow-data/scripts/molmicro',
            NEXTFLOW_S3_WORK_DIR = 's3://fredhutch-nextflow-data/workdir/molmicro',
            NEXTFLOW_S3_SESSION_CACHE = 's3://fredhutch-nextflow-data/session_data/molmicro',
            NEXTFLOW_DEFAULT_PROFILE = "batchman",
            API_KEY = os.environ.get('API_KEY') or get_api_key(),
            IAM_TASK_ROLE_ARN = "arn:aws:iam::431561177764:role/nextflow-fargate-runner-role",
        )
    }

class ProductionConfig(Config):
    # AUTH_METHOD = 'SAML'
    AUTH_METHOD = 'MOCK'
    MOCK_USERNAME = 'nkrumm'
    MOCK_GROUPS = ['u_labmed_dg_ngs-users', 'u_labmed_dg_molmicro']

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI= "postgresql://@127.0.0.1/batchman"
    AUTH_METHOD = 'MOCK'
    MOCK_USERNAME = 'nkrumm'
    MOCK_GROUPS = ['u_labmed_dg_ngs-users', 'u_labmed_dg_molmicro']

    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
    OPENAPI_SWAGGER_UI_VERSION = "3.23.11"
