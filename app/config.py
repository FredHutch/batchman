import os
basedir = os.path.abspath(os.path.dirname(__file__))

class Config(object):
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(
        basedir, 'app.db'
    )
    OPENAPI_VERSION = '3.0.2'
    API_PREFIX = '/api/v1'

    # ECS/Batch configuration
    ECS_CLUSTER = 'aws-batch-ce_Batch_1031105a-6a87-3673-8196-1d5723fb2991'
    ECS_SUBNETS = ["subnet-08f6b618bb7438e46"]
    NEXTFLOW_TASK_DEFINITION = 'nextflow-runner:10'
    NEXTFLOW_S3_TEMP = 'ncgl-dev-nkrumm.home-bucket'


class ProductionConfig(Config):
    AUTH_METHOD = 'SAML'

class DevelopmentConfig(Config):
    AUTH_METHOD = 'MOCK'
    OPENAPI_URL_PREFIX = '/docs'
    OPENAPI_REDOC_PATH = '/redoc'
    OPENAPI_SWAGGER_UI_PATH = '/swagger'
