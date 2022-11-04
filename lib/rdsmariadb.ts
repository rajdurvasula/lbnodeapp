
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export interface RdsMariadbProps {
    appVpcId: string;
    dbSubnetId1: string;
    dbSubnetId2: string;
    appDBUser: string;
    appDBUserPwd: string;
};

export class RdsMariadb extends Construct {
    constructor(scope: Construct, id: string, props: RdsMariadbProps) {
        super(scope, id);
        const appVpc = ec2.Vpc.fromLookup(this, 'AppVpc', {vpcId: props.appVpcId});
        // allow 3306
        const dbSG = new ec2.SecurityGroup(this,'DbSG', {
            vpc: appVpc,
            description: 'Security Group for RDS DB',
            allowAllOutbound: true
        });
        dbSG.addIngressRule(ec2.Peer.ipv4(appVpc.vpcCidrBlock), ec2.Port.tcp(3306), 'Allow 3306');
        // subnet group
        const dbSubnetGrp = new rds.SubnetGroup(this, 'DbSubnetGrp', {
            vpc: appVpc,
            description: 'App DB Subnet Group',
            subnetGroupName: 'DbSubnetGrp',
            vpcSubnets: {
                subnetFilters: [
                    ec2.SubnetFilter.byIds([ props.dbSubnetId1, props.dbSubnetId2 ])
                ]
            }
        });
        // mariadb instance
        const appDbInstance = new rds.DatabaseInstance(this, 'AppDbInstance', {
            vpc: appVpc,
            subnetGroup: dbSubnetGrp,
            engine: rds.DatabaseInstanceEngine.MARIADB,
            credentials: {
                username: props.appDBUser,
                password: cdk.SecretValue.unsafePlainText(props.appDBUserPwd)
            },
            databaseName: 'blog_db',
            multiAz: false,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
            securityGroups: [ dbSG ]
        });
    }
};


