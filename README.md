# Batchman

UI for Nextflow Pipelines 🚀



## Deployment

### Route 53

An private hosted DNS zone is used to identify batchbot. the `INTERNAL_HOST` ansible var should be `batchbot.labmed.internal` or similar. 

1. Go to the Route53 console
2. Ensure that the VPC hosting batchbot, as well as the aws-admin-batch VPC are associated with the "labmed.internal" hosted zone.
3. Find the internal IP address of the instance that hosts batchbot (eg. 10.0.0.118)
4. add A records for {{ INTERNAL_HOSTNAME }} --> IP address 

### VPC peering 

Because the AWS Batch infrastructure does not live in the same VPC as the Batchbot application (aws-admin-batch vs dokku-stack-apps or similar), you must create a VPC peering connection between them. This is currently *not part of the CFT deployment and must completed manually*

1. Create a new VPC peering connection, selecting the AWS batch VPC as well as the VPC in which batchbot is hosted.
2. After creating, accept the peering request in the console.
3. Add route tables for each, eg:
   - aws-admin-batch-private-subnet-rt
   - dokku-stack-apps-routetable
   
4. For the aws-admin-batch-private-subnet-rt, add a route "10.0.0.0/16" --> the peering connection ID (pcx-xxx...)
5. For the dokku-stack-apps-routetable, add a route "172.0.0.0/16" --> the peering connection (pcx-xxx...)
6. Update the security group of the dokku-stack-apps stack to allow inboutn 172.0.0.0/16 traffice.


