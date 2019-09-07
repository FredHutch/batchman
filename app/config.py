import os
basedir = os.path.abspath(os.path.dirname(__file__))

class Config(object):
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(
        basedir, 'app.db'
    )

class ProductionConfig(Config):
    AUTH_METHOD = 'SAML'

class DevelopmentConfig(Config):
    AUTH_METHOD = 'MOCK'
