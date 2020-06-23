web: gunicorn app.run:app -e FLASK_ENV='production' --enable-stdio-inheritance
release: FLASK_APP=run:app FLASK_ENV='production' flask db upgrade --directory ../migrations
