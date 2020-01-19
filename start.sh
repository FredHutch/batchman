#!/bin/bash

flask db upgrade && gunicorn app.run:app -e FLASK_ENV='production' --enable-stdio-inheritance -b 0.0.0.0:8000

