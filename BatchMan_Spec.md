# BatchMan Spec:

## "User" facing API for submitting workflows and retrieving data

/api/v1...

`/workflows`
	POST: Send git url, file(s), nextflow command + options, json parameters object. 
		  Adds data to workflow executions table
		  Executes workflow, returns 201 + workflow execution ID
	GET:  List of (paginated) executed workflows

also could have:
- `/workflows/running`
- `/workflows/queued`
- `/workflows/failed`

`/workflows/<id>`
	GET:    metadata around workflow execution
	DELETE: kill workflow

`/workflows/<id>/log`
	GET: main nextflow log 

`/workflows/<id>/status`
    GET: some sort of status?

`/workflows/<id>/tasks`
	GET: list of tasks that have been executed

`/workflows/<id>/tasks/<id>`
	GET: metadata for task

`/workflows/<id>/tasks/logs`
	GET: concatenated logs for all tasks?

`/workflows/<id>/tasks/<id>/logs`
	GET: logs specifically for task


## Nextflow facing:
`api/v1/weblog?key=$API_KEY`
	POST: receives data from nextflow logging 


## Future

`/workflows/<id>/tasks/<id>/metrics`
	GET: metrics specifically for task

`/workflows/<id>/dag(.html|.pdf|.dot)`
	GET: returns DAG

`/workflows/<id>/reports/(timeline|resource|summary)(.html|.pdf|.dot)`
	GET: return formatted report(s), e.g., timeline, resource, etc.







