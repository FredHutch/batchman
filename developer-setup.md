# Developer Setup

What is required for a developer to work on the Batchman app
(Javascript/React front-end and Python/Flask back end).

There are other cloud-based components that are part of Batchman but 
this document focuses on the main web app. 

[TODO: discuss setting up cloud components and/or configuring cloud components to work with the app as deployed on the developer's machine].

# Prerequisites

## Back End

* [Python 3.7](https://www.python.org/downloads/)
* [Pipenv](https://www.python.org/downloads/) - `pip3 install pipenv`
* [Postgresql](https://www.postgresql.org/download/) - on Mac, recommend [Postgres.app](https://postgresapp.com/)

## Front End

* [Node.js](https://nodejs.org/en/download/) / `npm`
* [Yarn](https://classic.yarnpkg.com/en/docs/install)





## Setting up the back end

After installing the back end prerequisites, clone the repo:

```
git clone https://github.com/FredHutch/batchman.git
```

Change to the appropriate branch:

```
git checkout fredhutch-quick-deploy
```

Create a virtual environment managed by Pipenv. This will install all Python dependencies.

```
pipenv install
```

Then activate that environment for your current shell:

```
pipenv shell
```

Create the database:

```
echo "create database batchman;" | psql -U postgres
```

Then run the migrations to create the database schema:

```
flask db upgrade
```

Run the python back end in development mode:

```
FLASK_ENV=development python3 run.py
```

You should now be able to access the back end at 

http://localhost:5000/

It is normal to see a "404 not found" error at that URL because you are not hitting an API endpoint. 

## Setting up the front end

In another terminal window, go to the directory where you cloned the batchman repository.

Verify that you are on the `fredhutch-quick-deploy` branch with the `git branch` command (there will be a `*` to the left of the current branch name).

Go to the frontend directory:

```
cd frontend
```

Install node.js dependencies:

```
npm install

```

Run the front end in development mode and launch it in a browser (at http://localhost:3000):

```
yarn start
```

Note that the front end proxies the back end, so you can reach API endpoints via the frontend, for example:

http://localhost:3000/api/v1/workflow


## Integrating local app with cloud components

[TODO: discuss ngrok, etc]