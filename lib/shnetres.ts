import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface ShNetResProps {
    appVpcId: string;
    appInstanceSubnetId1: string;
    appInstanceSubnetId2: string;
    inboundCidr: string;
    privateRtbId: string;
    tgwId: string;
};

export class ShNetRes extends Construct {
  constructor(scope: Construct, id: string, props: ShNetResProps) {
      super(scope, id);
      
      const appVpc = ec2.Vpc.fromLookup(this, 'AppVpc', {vpcId: props.appVpcId});
      // Security Group
      const epSG = new ec2.SecurityGroup(this, 'app-vpc-ep-sg', {
          allowAllOutbound: true,
          description: 'Security Group for VPC Endpoints',
          securityGroupName: 'app-vpc-ep-sg',
          vpc: appVpc
      });
      epSG.addIngressRule(ec2.Peer.ipv4(appVpc.vpcCidrBlock), ec2.Port.tcp(443), 'Allow 443');

      const region = process.env.CDK_DEFAULT_REGION;

      // VPC Endpoints
      const selectedSubnets = this.appVpc.selectSubnets({
        subnetFilters: [
          ec2.SubnetFilter.availabilityZones([ 'us-east-1a' ])
        ]
      });
      const privSubnet = selectedSubnets.subnets[0];
      const rtb = privSubnet.routeTable;
      const s3GWEP = new ec2.CfnVPCEndpoint(this, 'app-vpc-s3', {
        routeTableIds: [ rtb.routeTableId ],
        serviceName: `com.amazonaws.${region}.s3`,
        vpcId: appVpcId
      });
      appVpc.addInterfaceEndpoint('ssm-ep', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM,
        securityGroups: [ epSG ],
        subnets:
        {
            subnetFilters: [
                ec2.SubnetFilter.byIds([ props.appInstanceSubnetId1, props.appInstanceSubnetId2 ])
            ]
        },
      });
      appVpc.addInterfaceEndpoint('ssmmessages-ep', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        securityGroups: [ epSG ],
        subnets:
        {
            subnetFilters: [
                ec2.SubnetFilter.byIds([ props.appInstanceSubnetId1, props.appInstanceSubnetId2 ])
            ]
        },
      });
      appVpc.addInterfaceEndpoint('ec2-ep', {
            service: ec2.InterfaceVpcEndpointAwsService.EC2,
            securityGroups: [ epSG ],
            subnets:
            {
                subnetFilters: [
                    ec2.SubnetFilter.byIds([ props.appInstanceSubnetId1, props.appInstanceSubnetId2 ])
                ]
            },
      });
      // Routes
      const internVpcRoute = new ec2.CfnRoute(this, 'InternVpcRoute', {
          destinationCidrBlock: props.inboundCidr,
          routeTableId: props.privateRtbId,
          transitGatewayId: props.tgwId
      });
  }
};
