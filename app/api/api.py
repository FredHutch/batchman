from flask import jsonify, make_response, abort, current_app, redirect, request
from flask_restful import Resource

from webargs import fields
from webargs.flaskparser import use_args
from webargs.flaskparser import parser

@parser.error_handler
def handle_parse_error(error, *args, **kwargs):
    print(error)
    abort(422, messages=error.messages, exc=error)


class MyApi(Resource):
    def get(self):        
        return {"msg": "hello world."}

    @use_args({
        'int_arg': fields.Int(missing=5),
        'str_arg': fields.Str(missing="None"),
    })
    def post(self, args):
        print(args)
        return args