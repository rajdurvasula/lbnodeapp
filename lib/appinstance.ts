
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';

export interface AppInstanceProps {
  appVpcId: string;
  appInstanceSubnetId1: string;
  appInstanceSubnetId2: string;
  inboundCidr: string;
  appDBUser: string;
  appDBPwd: string;
  appBucket: string;
  appKey: string;
  dbHost: string;
};

export class AppInstance extends Construct {
  constructor(scope: Construct, id: string, props: AppInstanceProps) {
    super(scope, id);
    
    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;
    
    
    const appVpc = ec2.Vpc.fromLookup(this, 'AppVpc', {vpcId: props.appVpcId})

    // allow 8080
    const appSg = new ec2.SecurityGroup(this, 'AppSg', {
      vpc: appVpc,
      description: 'Security Group for Application',
      allowAllOutbound: true
    });
    appSg.addIngressRule(ec2.Peer.ipv4(appVpc.vpcCidrBlock), ec2.Port.tcp(8080), 'Allow 8080');
    const instSsmRole = new iam.Role(this, 'InstSsmRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'SSM Role for EC2 Instances'
    });
    instSsmRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    instSsmRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'));
    // latest amazon linux 2 image
    const amzLinAmi = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.X86_64
    });
    const instance1 = new ec2.Instance(this, 'Instance1', {
      instanceName: 'Instance1',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: amzLinAmi,
      securityGroup: appSg,
      role: instSsmRole,
      vpc: appVpc,
      vpcSubnets: {
        subnetFilters: [
          ec2.SubnetFilter.byIds([ props.appInstanceSubnetId1 ])
        ]
      }
    });
    const instance2 = new ec2.Instance(this, 'Instance2', {
      instanceName: 'Instance2',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: amzLinAmi,
      securityGroup: appSg,
      role: instSsmRole,
      vpc: appVpc,
      vpcSubnets: {
        subnetFilters: [
          ec2.SubnetFilter.byIds([ props.appInstanceSubnetId1 ])
        ]
      }
    });
    cdk.Tags.of(instance1).add('ProjectName', 'PROJ-SharedNetwork');
    cdk.Tags.of(instance2).add('ProjectName', 'PROJ-SharedNetwork');
    // user data
    const userDataAsset1 = new Asset(this, 'ConfigAsset', {
      path: path.join(__dirname, '../src/scripts/config.sh')
    });
    const userDataAsset2 = new Asset(this, 'SetupAsset', {
      path: path.join(__dirname, '../src/scripts/setup_app.sh')
    });
    const inst1_localPath1 = instance1.userData.addS3DownloadCommand({
      bucket: userDataAsset1.bucket,
      bucketKey: userDataAsset1.s3ObjectKey
    });
    const inst1_localPath2 = instance1.userData.addS3DownloadCommand({
      bucket: userDataAsset2.bucket,
      bucketKey: userDataAsset2.s3ObjectKey
    });
    const inst2_localPath1 = instance2.userData.addS3DownloadCommand({
      bucket: userDataAsset1.bucket,
      bucketKey: userDataAsset1.s3ObjectKey
    });
    const inst2_localPath2 = instance2.userData.addS3DownloadCommand({
      bucket: userDataAsset2.bucket,
      bucketKey: userDataAsset2.s3ObjectKey
    });
    const args = props.appBucket+' '+props.appKey+' '+props.appDBUser+' '+props.appDBPwd+' '+props.dbHost;
    instance1.userData.addExecuteFileCommand({
      filePath: inst1_localPath1,
      arguments: '--verbose -y'
    });
    instance1.userData.addExecuteFileCommand({
      filePath: inst1_localPath2,
      arguments: args
    });
    instance2.userData.addExecuteFileCommand({
      filePath: inst2_localPath1,
      arguments: '--verbose -y'
    });
    instance2.userData.addExecuteFileCommand({
      filePath: inst2_localPath2,
      arguments: args
    });
    userDataAsset1.grantRead(instance1.role);
    userDataAsset1.grantRead(instance2.role);
    userDataAsset2.grantRead(instance1.role);
    userDataAsset2.grantRead(instance2.role);

  }
}
