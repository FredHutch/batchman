web: gunicorn app.run:app -e FLASK_ENV='production' --enable-stdio-inheritance
release: FLASK_APP=app.run:app flask db upgrade
