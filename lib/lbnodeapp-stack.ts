import { CfnParameter, CfnOutput, Duration, Stack, StackProps, SecretValue } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { AppInstance } from './appinstance';
import { RdsMariadb } from './rdsmariadb';
import { ShNetRes } from './shnetres';
import { IntAlb } from './intalb';
 
export class LbnodeappStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // context keys
    // appVpcId
    // albSubnetId1
    // albSubnetId2
    // appInstanceSubnetId1
    // appInstanceSubnetId2
    // dbSubnetId
    // privateRtbId
    // tgwId
    const appVpcId = Stack.of(this).node.tryGetContext('appVpcId');
    const albSubnetId1 = Stack.of(this).node.tryGetContext('albSubnetId1');
    const albSubnetId2 = Stack.of(this).node.tryGetContext('albSubnetId2');
    const appInstanceSubnetId1 = Stack.of(this).node.tryGetContext('appInstanceSubnetId1');
    const appInstanceSubnetId2 = Stack.of(this).node.tryGetContext('appInstanceSubnetId2');
    const dbSubnetId1 = Stack.of(this).node.tryGetContext('dbSubnetId1');
    const dbSubnetId2 = Stack.of(this).node.tryGetContext('dbSubnetId2');
    const privateRtbId = Stack.of(this).node.tryGetContext('privateRtbId');
    const tgwId = Stack.of(this).node.tryGetContext('tgwId');

    const inboundCidr = new CfnParameter(this, 'InboundCidr', {
      type: 'String',
      description: 'CIDR for inbound traffic',
      allowedPattern: '^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$'
    });
    
    const appDBUser = new CfnParameter(this, 'AppDBUser', {
      type: 'String',
      description: 'Application DB User'
    });
    const appDBPwd = new CfnParameter(this, 'AppDBPwd', {
      type: 'String',
      description: 'Application DB Password'
    });
    const appBucket = new CfnParameter(this, 'AppBucket', {
      type: 'String',
      description: 'S3 Bucket where App Package is located'
    });
    const appKey = new CfnParameter(this, 'AppKey', {
      type: 'String',
      description: 'App Package Filename'
    });
    
    const appVpc = ec2.Vpc.fromLookup(this, 'AppVpc', {vpcId: appVpcId})
    
    const shNetResources = new ShNetRes(this, 'ShNetRes', {
      appVpcId: appVpcId,
      appInstanceSubnetId1: appInstanceSubnetId1,
      appInstanceSubnetId2: appInstanceSubnetId2,
      inboundCidr: '0.0.0.0/0',
      privateRtbId: privateRtbId,
      tgwId: tgwId
    });
    
    const rdsMariaDB = new RdsMariadb(this, 'RDSMariaDB', {
      dbSubnetId1: dbSubnetId1,
      dbSubnetId2: dbSubnetId2,
      appDBUser: appDBUser.valueAsString,
      appDBUserPwd: appDBPwd.valueAsString,
      appVpcId: appVpcId
    });
    const dbInstance = rdsMariaDB.node.findChild('AppDbInstance') as rds.DatabaseInstance;
    
    const appInstances = new AppInstance(this, 'AppInstances', {
      appVpcId: appVpcId,
      appInstanceSubnetId1: appInstanceSubnetId1,
      appInstanceSubnetId2: appInstanceSubnetId2,
      inboundCidr: inboundCidr.valueAsString,
      appDBUser: appDBUser.valueAsString,
      appDBPwd: appDBPwd.valueAsString,
      appBucket: appBucket.valueAsString,
      appKey: appKey.valueAsString,
      dbHost: dbInstance.dbInstanceEndpointAddress
    });
    appInstances.node.addDependency(shNetResources);
    appInstances.node.addDependency(rdsMariaDB);
    
    const instance1 = appInstances.node.findChild('Instance1') as ec2.Instance;
    const instance2 = appInstances.node.findChild('Instance2') as ec2.Instance;
    const appAlb = new IntAlb(this, 'AppAlb', {
      albSubnetId1: albSubnetId1,
      albSubnetId2: albSubnetId2,
      appVpcId: appVpcId,
      inboundCidr: inboundCidr.valueAsString,
      instanceId1: instance1.instanceId,
      instanceId2: instance2.instanceId,
    });
    appAlb.node.addDependency(appInstances);
    const appAlbInstance = appAlb.node.findChild('IntAlb') as elbv2.ApplicationLoadBalancer;
    
    // exports
    new CfnOutput(this, 'DBEndpointAddress', {
      description: 'DB Endpoint Address',
      value: dbInstance.dbInstanceEndpointAddress
    });
    new CfnOutput(this, 'IntAlbEndpoint', {
      description: 'Internal ALB Endpoint Address',
      value: appAlbInstance.loadBalancerDnsName
    });
  }
}
