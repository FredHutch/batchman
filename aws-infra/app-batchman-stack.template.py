from troposphere import Template, Ref, Tags, Join, GetAtt, Parameter, Output
import troposphere.rds as rds

def tag_builder(name_suffix=None):
    if name_suffix:
        name = Join("-", [Ref("AWS::StackName"), name_suffix])
    else:
        name = Ref("AWS::StackName")
    return Tags(Application=Ref("AWS::StackId"), Name=name)


t = Template()
t.set_version()
t.set_description("Batchman application stack")


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
        "DBPassword", Description="DB Password", Type="String"
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

db_logical_id = "AppBatchmanRDSInstance"
database_instance = rds.DBInstance(
    db_logical_id,
    AllocatedStorage="10", # GB
    DBInstanceClass="db.t2.small",
    DBInstanceIdentifier=Ref("AWS::StackName"),
    DBName=Ref("DBName"),
    DBSubnetGroupName=Ref("DBSubnetGroupName"),
    Engine="postgres",
    EngineVersion="11.5",
    MasterUserPassword=Ref("DBPassword"),
    MasterUsername=Ref("DBUsername"),
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