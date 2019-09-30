from functools import wraps
from flask import request, abort, current_app

# from https://coderwall.com/p/4qickw/require-an-api-key-for-a-route-in-flask-using-only-a-decorator
def require_apikey(view_function):
    @wraps(view_function)
    def decorated_function(*args, **kwargs):
        if request.args.get('key') and request.args.get('key') == current_app.config["API_KEY"]:
            return view_function(*args, **kwargs)
        else:
            abort(401)
    return decorated_function