# Event reference and examples

This page contains example events for Nextflow weblog events and AWS ECS/Batch events.

## Nextflow `-with-weblog` events

Information about the `-with-weblog` event system from Nextflow can be found here: https://www.nextflow.io/docs/latest/tracing.html

### Types of events:

1. Workflow Started
2. Process Submitted
3. Process Started
4. Process Finished
5. Error
6. Workflow Completed


#### Workflow Started

```json
{
    "parameters": {
        "input_folder": "s3://uwlm-ngs-data/targeted/opx/fastqs/2019/190104_HA0570_OncoPlexKAPA327-OPXv5/sample/32725_A04_OPXv5_HA0570/"
    },
    "workflow": {
        "commandLine": "nextflow run main.nf -config nextflow.config -with-weblog 'https://batchman-api.labmed.uw.edu/api/v1/weblog?key=W172GBqdGXCpSxZNeVdnx01reGEhPbv6Oa9TFOySdvy-RE2cSc5byg'",
        "commitId": null,
        "complete": null,
        "configFiles": [
            "/nextflow.config",
            "/nextflow.config"
        ],
        "container": {},
        "containerEngine": null,
        "duration": null,
        "errorMessage": null,
        "errorReport": null,
        "exitStatus": null,
        "homeDir": "/root",
        "launchDir": "/",
        "manifest": {
            "author": null,
            "defaultBranch": "master",
            "description": null,
            "gitmodules": null,
            "homePage": null,
            "mainScript": "main.nf",
            "name": null,
            "nextflowVersion": null,
            "version": null
        },
        "nextflow": {
            "build": 5106,
            "timestamp": "2019-07-27T13:22:00Z",
            "version": "19.07.0"
        },
        "profile": "standard",
        "projectDir": "/",
        "repository": null,
        "resume": false,
        "revision": null,
        "runName": "serene_babbage",
        "scriptFile": "/main.nf",
        "scriptId": "d0c3697c88097f4c76b665d3554fe400",
        "scriptName": "main.nf",
        "sessionId": "1e01c1a6-06d5-45b8-8134-31e4271c3c22",
        "start": "2019-10-02T16:23:29Z",
        "stats": {
            "cachedCount": 0,
            "cachedCountFmt": "0",
            "cachedDuration": 0,
            "cachedPct": 0.0,
            "computeTimeFmt": "(a few seconds)",
            "failedCount": 0,
            "failedCountFmt": "0",
            "failedDuration": 0,
            "failedPct": 0.0,
            "ignoredCount": 0,
            "ignoredCountFmt": "0",
            "ignoredPct": 0.0,
            "succeedCount": 0,
            "succeedCountFmt": "0",
            "succeedDuration": 0,
            "succeedPct": 0.0
        },
        "success": false,
        "userName": "root",
        "workDir": "s3://uwlm-personal/nkrumm/nextflow-work-dir"
    }
}
```

#### Process submitted


```json
{
    "attempt": 1,

    "container": "quay.io/biocontainers/fastqc:0.11.8--1",
    "cpus": 1,
    "disk": null,

    "env": "PATH=/bin:$PATH\n",

    "exit": 2147483647,
    "hash": "8f/650b3e",
    "memory": null,
    "module": [],
    "name": "fastqc (1)",
    "native_id": "c1610fe4-2428-4da8-a868-1f3b53733169",
    "process": "fastqc",
    "queue": "default-queue",

    "scratch": null,
    "script": "\n    mkdir fastqc_32725_A04_OPXv5_HA0570_output\n    fastqc -o fastqc_32725_A04_OPXv5_HA0570_output 32725_A04_OPXv5_HA0570.1.fastq.gz 32725_A04_OPXv5_HA0570.2.fastq.gz\n    ",
    "start": 0,
    "status": "SUBMITTED",
    "submit": 1570033411536,
    "tag": null,
    "task_id": 1,
    "time": null,
    "workdir": "s3://uwlm-personal/nkrumm/nextflow-work-dir/8f/650b3e6f07b2c7165961c5b265f58f"
}
```

#### Process Started

```json
{
    "attempt": 1,
    
    "container": "quay.io/biocontainers/fastqc:0.11.8--1",
    "cpus": 1,
    "disk": null,

    "env": "PATH=/bin:$PATH\n",
    
    "exit": 2147483647,
    "hash": "8f/650b3e",
    "memory": null,
    "module": [],
    "name": "fastqc (1)",
    "native_id": "c1610fe4-2428-4da8-a868-1f3b53733169",
    "process": "fastqc",
    "queue": "default-queue",
    
    "scratch": null,
    "script": "\n    mkdir fastqc_32725_A04_OPXv5_HA0570_output\n    fastqc -o fastqc_32725_A04_OPXv5_HA0570_output 32725_A04_OPXv5_HA0570.1.fastq.gz 32725_A04_OPXv5_HA0570.2.fastq.gz\n    ",
    "start": 1570033570702,
    "status": "RUNNING",
    "submit": 1570033411536,
    "tag": null,
    "task_id": 1,
    "time": null,
    "workdir": "s3://uwlm-personal/nkrumm/nextflow-work-dir/8f/650b3e6f07b2c7165961c5b265f58f"
}
```

#### Process Completed

```json
{
    "attempt": 1,
    "complete": 1570033730750,
    "container": "quay.io/biocontainers/fastqc:0.11.8--1",
    "cpus": 1,
    "disk": null,
    "duration": 319214,
    "env": "PATH=/bin:$PATH\n",
    "error_action": null,
    "exit": 0,
    "hash": "8f/650b3e",
    "memory": null,
    "module": [],
    "name": "fastqc (1)",
    "native_id": "c1610fe4-2428-4da8-a868-1f3b53733169",
    "process": "fastqc",
    "queue": "default-queue",
    "realtime": 160048,
    "scratch": null,
    "script": "\n    mkdir fastqc_32725_A04_OPXv5_HA0570_output\n    fastqc -o fastqc_32725_A04_OPXv5_HA0570_output 32725_A04_OPXv5_HA0570.1.fastq.gz 32725_A04_OPXv5_HA0570.2.fastq.gz\n    ",
    "start": 1570033570702,
    "status": "COMPLETED",
    "submit": 1570033411536,
    "tag": null,
    "task_id": 1,
    "time": null,
    "workdir": "s3://uwlm-personal/nkrumm/nextflow-work-dir/8f/650b3e6f07b2c7165961c5b265f58f"
}
```

### Error

To do.


#### Workflow completed


```json
{
    "parameters": {
        "input_folder": "s3://uwlm-ngs-data/targeted/opx/fastqs/2019/190104_HA0570_OncoPlexKAPA327-OPXv5/sample/32725_A04_OPXv5_HA0570/"
    },
    "workflow": {
        "commandLine": "nextflow run main.nf -config nextflow.config -with-weblog 'https://batchman-api.labmed.uw.edu/api/v1/weblog?key=W172GBqdGXCpSxZNeVdnx01reGEhPbv6Oa9TFOySdvy-RE2cSc5byg'",
        "commitId": null,
        "complete": "2019-10-02T16:29:40Z",
        "configFiles": [
            "/nextflow.config",
            "/nextflow.config"
        ],
        "container": {},
        "containerEngine": null,
        "duration": 371056,
        "errorMessage": null,
        "errorReport": null,
        "exitStatus": 0,
        "homeDir": "/root",
        "launchDir": "/",
        "manifest": {
            "author": null,
            "defaultBranch": "master",
            "description": null,
            "gitmodules": null,
            "homePage": null,
            "mainScript": "main.nf",
            "name": null,
            "nextflowVersion": null,
            "version": null
        },
        "nextflow": {
            "build": 5106,
            "timestamp": "2019-07-27T13:22:00Z",
            "version": "19.07.0"
        },
        "profile": "standard",
        "projectDir": "/",
        "repository": null,
        "resume": false,
        "revision": null,
        "runName": "serene_babbage",
        "scriptFile": "/main.nf",
        "scriptId": "d0c3697c88097f4c76b665d3554fe400",
        "scriptName": "main.nf",
        "sessionId": "1e01c1a6-06d5-45b8-8134-31e4271c3c22",
        "start": "2019-10-02T16:23:29Z",
        "stats": {
            "cachedCount": 0,
            "cachedCountFmt": "0",
            "cachedDuration": 0,
            "cachedPct": 0.0,
            "computeTimeFmt": "(a few seconds)",
            "failedCount": 0,
            "failedCountFmt": "0",
            "failedDuration": 0,
            "failedPct": 0.0,
            "ignoredCount": 0,
            "ignoredCountFmt": "0",
            "ignoredPct": 0.0,
            "succeedCount": 2,
            "succeedCountFmt": "2",
            "succeedDuration": 170106,
            "succeedPct": 100.0
        },
        "success": true,
        "userName": "root",
        "workDir": "s3://uwlm-personal/nkrumm/nextflow-work-dir"
    }
}
```
