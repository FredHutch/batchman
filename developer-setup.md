# Author/Contribution/Comments/Questions

`@dtenenba` is the main author of this document (so far).
If you have questions (did I leave something out?) or comments, please [file an issue](https://github.com/FredHutch/batchman/issues/new) and label it `documentation` and tag `@dtenenba`. 

# Overview of Batchman

The main focus of this document is getting a developer set up to develop on Batchman. However, it is worth giving a quick overview of Batchman because not a lot of documentation exists about it.

Batchman originated at the UW and Fred Hutch is planning to contribute to the development effort.

Batchman consists of a number of components. We'll discuss them in turn.

## Batchman Web App

The web app is in the GitHub repository at https://github.com/FredHutch/batchman .
In this document we are working entirely in the `fredhutch-quick-deploy` branch.
This app is also deployed at https://batchman-dev.fredhutch.org/ (contact Dan Tenenbaum for the username and password of this app).
This deployment is just for development.

No decisions have been made about how and where to deploy the production (and potentially test, staging etc) versions of this app.

The web app has two main components (discussed further below).

The back end is written in Python using the Flask framework. 
It is a REST API. It needs to talk to a SQL database. The 
production instance talks to an RDS (Postgres) database in AWS. 
In development, it talks to a local Postgres database. 

The front end is written in Javascript using the React framework.
Is is the main client of the REST API provided by the back end, 
however, some of the cloud components (discussed below) 
post to one of the API endpoints (and efforts around authentication must take this into account).



## Cloud Components

There are several components that live in the cloud.

These components are created by a CloudFormation template which in 
turn is created by Python scripts (using Troposphere) in this repository:

https://github.com/nkrumm/batchman-infra

Probably this repo should also be moved into the Fred Hutch org, as there will need to be changes that are Fred Hutch specific. See [this issue](https://github.com/nkrumm/batchman-infra/issues/3).

The main cloud components are:

### Nextflow Runner ECS Task

When a user submits a workflow in Batchman, a container is spun up in 
[ECS](https://aws.amazon.com/ecs/) (Elastic Container Service) which runs [Nextflow](https://www.nextflow.io/). This container will stay up as long as the workflow is running, and its logs/state change events are sent back to the app by posting to one of the API endpoints.

### Lambda function and triggers

The lambda function just takes its input event and posts it to an API endpoint exposed by the web app back end.

It has two triggers, both are CloudWatch events. The first is ECS and task and container state change events. The second is all events from AWS Batch.

### AWS Batch Infrastructure

This includes compute environments, queues, and 
other infrastructure necessary to run AWS Batch jobs, and 
specifically an EC2 launch template that takes care of nextflow-specific things (for example, making sure that the AWS CLI is available on any container run by nextflow, and handling dynamically scaling scratch space).

### Misc

There is other cloud infrastructure created by the `batchman-infra` repo. It is mostly lower-level stuff which supports the larger components above. Examples include VPCs and subnets, IAM roles and policies, log streams, S3 buckets, etc. 

## Functionality & Flow

TODO


# Developer Setup

What is required for a developer to work on the Batchman app
(Javascript/React front-end and Python/Flask back end).

There are other cloud-based components that are part of Batchman but 
this document focuses on developing the main web app. 

[TODO: discuss setting up cloud components and/or configuring cloud components to work with the app as deployed on the developer's machine].



# Prerequisites

## Back End

* [Python 3.7](https://www.python.org/downloads/)
* [Pipenv](https://www.python.org/downloads/) - `pip3 install pipenv`
* [Postgresql](https://www.postgresql.org/download/) - on Mac, recommend [Postgres.app](https://postgresapp.com/)

## Front End

* [Node.js](https://nodejs.org/en/download/) / `npm`
* [Yarn](https://classic.yarnpkg.com/en/docs/install)


## AWS credentials

In order to be able to usefully develop the app, you will need some AWS credentials. Contact Dan Tenenbaum to receive them.

If you have multiple AWS profiles, please make sure the one for Batchman is active before running the back end (below). This can be done by setting the `AWS_PROFILE` environment variable to the name of the AWS profile you want to use (this can be found in in your `~/.aws/config` file).


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
You only need to do this once (unless the dependencies change).

```
pipenv install
```

Then activate that environment for your current shell. You need to do this every time you want your shell to be able to find the virtual environment:

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

Note that you can also hit a [Swagger endpoint](https://swagger.io/) at 

http://localhost:5000/docs/swagger

This allows you to easily make API requests from the browser. (Alternatively you can use tools like `curl` or [Postman](https://www.postman.com/)).

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

For more information about the front end, see
the [README](https://github.com/FredHutch/batchman/blob/master/frontend/README.md) in the `frontend` directory.

Note that the front end proxies the back end, so you can reach API endpoints via the frontend, for example:

http://localhost:3000/api/v1/workflow

(Note that for some reason, the [Swagger URL](http://localhost:5000/docs/swagger) mentioned above does not proxy successfully in local development mode. It works with the deployed version of the app).

## Integrating local app with cloud components

If you want to tie in your locally-running app to the cloud components of Batchman, you need to create a publicly accessible URL that points to the locally running app.

You can do this with [ngrok](https://ngrok.com/).
Please install `ngrok` and, once you have the front end and back end running, run `ngrok` in a new terminal window as follows:

```
ngrok http 3000
```

This will give you several URLs, including an `https` URL and a Web interface. The `https` URL is a public URL that routes to the locally running version of the app.

The web interface is an extremely useful tool that allows you to see the requests coming in and the responses going out, and allows you to replay requests.

### Telling the cloud components about the local version of the app

With `ngrok` you can tell the cloud components of Batchman to send their events to the locally-running app.

To make this work you have to make changes in two places.

1. The app configuration. Open [app/config.py](app/config.py) and change `API_ENDPOINT` to be the `https` URL from `ngrok`. **Do not commit this change to GitHub;** this change should only exist during your development session.
2. Open the [Batchman Lambda Function](https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/batchman-AWSBatchNextflowRunnerCloudwatchEventLamb-1XCZ1CWL3DYOF?tab=configuration) in the AWS Lambda console and comment out the line containing the API endpoint, then add 
a new URL pointing to the same API endpoint on the ngrok version of the app. For example:

```python
        #'https://batchman-dev.fredhutch.org/api/v1/ecslog',
        'https://c05b39e9.ngrok.io/api/v1/ecslog',
```

Note that your `ngrok` URL will be slightly different.
Also be sure to change this back to how it was (with the `batchman-dev` URL active) at the end of your development session.

**Note**: If multiple people are developing Batchman at the same time using this method, we may want to set up another AWS account. Because if one developer is doing these steps, the other developer will not receive events from the clpud components. This method can basically only be used by one developer at a time, and it makes Batchman (at least in this AWS account) unusable by others. Since this is a development account, this is not a huge problem.

...




## Testing

Now that you have the app running locally, and you have the cloud components communicating with it, you can submit a workflow.

Go to the `ngrok` `https` URL in your web browser.

Click `Submit` and then `Interactive Editor`.



In the `Config` section, paste the following:

```hocon
params.input_folder = 's3://fredhutch-nextflow-data/input-fastqs/'

workDir = 's3://fredhutch-nextflow-data/nkrumm/nextflow-work-dir'

executor.disableRemoteBinDir = true

process {
  scratch = "/docker_scratch"
  queue = 'batchman-poc'
  executor = 'awsbatch'
}

aws {
      region = 'us-west-2'
      batch {
        volumes = '/docker_scratch'
        cliPath = '/home/ec2-user/miniconda/bin/aws'
      }
}

```


In the `Nextflow script` section, paste the following:


```nextflow
#!/usr/bin/env nextflow


fastq_pair_ch = Channel.fromFilePairs(params.input_folder + '/*{1,2}.fastq.gz', flat:true).take(5)


process fastqc {
    container 'quay.io/biocontainers/fastqc:0.11.8--1'
    echo true
    memory '4 GB'
    input:
    set pair_name, file(fastq1), file(fastq2) from fastq_pair_ch

    output:
    file "fastqc_${pair_name}_output" into fastqc_ch

    script:
    """
    mkdir fastqc_${pair_name}_output
    fastqc -o fastqc_${pair_name}_output $fastq1 $fastq2
    """
}


process multiqc {
   container 'quay.io/biocontainers/multiqc:1.7--py_4'
   publishDir 's3://fredhutch-nextflow-data/nkrumm/nextflow-publish-dir'
   memory '4 GB'
   input:
   file('*') from fastqc_ch.collect()

   output:
   file "multiqc_report.html"

   script:
   """
   multiqc .
   """
}

```

These are valid `.config` and `.nf` files for our dev account.

Now click "Run Workflow" and this should kick off a workflow and you will be able to see what Batchman looks like in action.

The `/api/v1/ecslog` endpoint in the app should receive events from the cloud components (via the Lambda function) and you will see the display update. You can also follow along in the AWS Batch console.




If you ever want to feed events to the endpoint yourself or via a script, see the [event reference document](event-reference.md) for more on the events that Nextflow sends. (This does not cover the events that AWS Batch sends. 

Another way of submitting workflows is to use the Wizard. Click on `Submit` and then `Wizard`. Paste in the following URL:

https://github.com/nhoffman/dada2-nf

This URL points to a github repo that has a file called [template.json](https://github.com/nhoffman/dada2-nf/blob/master/template.json) which defines a React template letting you fill in values in a form.
This is great for less experienced users who want to run a pre-existing workflow using their own data.

The template technology used is called [react-jsonschema-form](https://react-jsonschema-form.readthedocs.io/en/latest/).



TODO: include graphs


