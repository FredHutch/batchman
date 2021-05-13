from troposphere import Template, Ref, Tags, Join, GetAtt, Parameter, Output
import troposphere.rds as rds
import troposphere.iam as iam
import troposphere.secretsmanager as secretsmanager
from awacs import secretsmanager as awacs_sm

from awacs.aws import (Action, Allow, Deny, Policy, PolicyDocument, Principal, 
    Statement, Condition, IpAddress)
from awacs.batch import (DescribeJobQueues, DescribeJobs, DescribeJobDefinitions, 
    ListJobs, DescribeComputeEnvironments)

def tag_builder(name_suffix=None):
    if name_suffix:
        name = Join("-", [Ref("AWS::StackName"), name_suffix])
    else:
        name = Ref("AWS::StackName")
    return Tags(Application=Ref("AWS::StackId"), Name=name)


t = Template()
t.set_version()
t.set_description("Batchbot application stack")


t.add_parameter(
    Parameter(
        "DBName", Description="DB Name", Type="String"
    )
)
t.add_parameter(
    Parameter(
        "DBUsername", Description="DB username", Type="String"
    )
)
t.add_parameter(
    Parameter(
        "DBSecurityGroup", Description="Name of VPC Security Group (e.g., sg-1234512345)", Type="String"
    )
)
t.add_parameter(
    Parameter(
        "DBSubnetGroupName", Description="DBSubnetGroupName e.g., dokku-stack-dev-dbsubnetgroup-123412312", Type="String"
    )
)
t.add_parameter(
    Parameter(
        "DBIResourceId", Description="DBI Resource Id, found in console AFTER RDS instance is launched.", Type="String"
    )
)
application_policy = iam.ManagedPolicy(
    "AppBatchbotPolicy",
    ManagedPolicyName="AppBatchbotPolicy",
    PolicyDocument=PolicyDocument(
        Version="2012-10-17",
        Statement=[
            Statement(
                Effect=Allow,
                Action=[DescribeJobQueues, DescribeJobs,
                    DescribeJobDefinitions, ListJobs, DescribeComputeEnvironments,
                    Action("logs", "*"), Action("ecs", "*")],
                Resource=["*"]
            ),
            Statement(
                Effect=Allow,
                Action=[Action("s3", "*")],
                Resource=[
                    "arn:aws:s3:::*",
                    "arn:aws:s3:::ncgl-prod.sample-bucket",
                    "arn:aws:s3:::ncgl-prod.sample-bucket/*",
                    "arn:aws:s3:::ncgl-prod.run-bucket",
                    "arn:aws:s3:::ncgl-prod.run-bucket/*",
                    "arn:aws:s3:::ncgl-prod.references-bucket",
                    "arn:aws:s3:::ncgl-prod.references-bucket/*"
                ]
            ),
            Statement(
                Effect=Allow,
                Action=[Action("rds-db", "connect")],
                Resource=[
                    # TODO: determine how to fill this in from template
                    # see: https://github.com/aws-cloudformation/aws-cloudformation-coverage-roadmap/issues/105
                    Join("", ["arn:aws:rds-db:us-west-2:", Ref("AWS::AccountId"), 
                              ":dbuser:",Ref("DBIResourceId"),"/"
                              "batchbot_user"])
                ]
            ),
            Statement(
                Effect=Allow,
                Action=[Action("iam", "PassRole")],
                Resource=[
                    Join("", ["arn:aws:iam::", Ref("AWS::AccountId"), ":role/EcsTaskExecutionRoleForNextflowRunner"]),
                    Join("", ["arn:aws:iam::", Ref("AWS::AccountId"), ":role/nextflow-fargate-runner-role"])
                ]
            ),
            Statement(
                Effect=Allow,
                Action=[
                    awacs_sm.GetSecretValue,
                ],
                Resource=[
                    Join("", ["arn:aws:secretsmanager:us-west-2:", Ref("AWS::AccountId"), ":secret:/app/batchbot/*"])
                ],
            ),
        ]
    )
)
t.add_resource(application_policy)

rds_password = secretsmanager.Secret(
        "AppBatchbotRDSInstancePassword",
        Name="/app/batchbot/dbpassword",
        GenerateSecretString=secretsmanager.GenerateSecretString(
            PasswordLength=32,
            ExcludePunctuation=True
        )
)
t.add_resource(rds_password)

db_logical_id = "AppBatchbotRDSInstance"
database_instance = rds.DBInstance(
    db_logical_id,
    DependsOn="AppBatchbotRDSInstancePassword",
    AllocatedStorage="30", # GB
    DBInstanceClass="db.t2.small",
    DBInstanceIdentifier=Ref("AWS::StackName"),
    DBName=Ref("DBName"),
    DBSubnetGroupName=Ref("DBSubnetGroupName"),
    Engine="postgres",
    EngineVersion="12.3",
    MasterUserPassword="{{resolve:secretsmanager:/app/batchbot/dbpassword}}",
    MasterUsername=Ref("DBUsername"),
    EnableIAMDatabaseAuthentication=True,
    MultiAZ="false",
    StorageEncrypted="true",
    StorageType="standard",
    VPCSecurityGroups=[Ref("DBSecurityGroup")],
    Tags=tag_builder(),
)

t.add_resource(database_instance)

t.add_output(
    [
        Output(
            "RDSEndpoint",
            Description="DNS name of RDS instance",
            Value=GetAtt(database_instance, "Endpoint.Address"),
        )
    ]
)


print(t.to_json())