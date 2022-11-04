import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2target from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

export interface IntAlbProps {
    instanceId1: string,
    instanceId2: string,
    inboundCidr: string,
    albSubnetId1: string,
    albSubnetId2: string,
    appVpcId: string
};

export class IntAlb extends Construct {
    constructor(scope: Construct, id: string, props: IntAlbProps) {
        super(scope, id);
        // lookup vpc
        const appVpc = ec2.Vpc.fromLookup(this, 'AppVpc', {vpcId: props.appVpcId})
        // security group for alb
        const intAlbSg = new ec2.SecurityGroup(this, 'IntAlbSg', {
            description: 'Security Group for IntAlb',
            allowAllOutbound: true,
            securityGroupName: 'IntAlbSg',
            vpc: appVpc
        });
        intAlbSg.addIngressRule(ec2.Peer.ipv4(props.inboundCidr), ec2.Port.tcp(80), 'Allow 80');
        // target group
        const intTg = new elbv2.ApplicationTargetGroup(this, 'IntTg', {
            port: 8080,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetGroupName: 'IntTg',
            targetType: elbv2.TargetType.INSTANCE,
            targets: [
                new elbv2target.InstanceIdTarget(props.instanceId1),
                new elbv2target.InstanceIdTarget(props.instanceId2)
            ],
            vpc: appVpc
        });
        // internal ALB
        const intAlb = new elbv2.ApplicationLoadBalancer(this, 'IntAlb', {
            internetFacing: false,
            loadBalancerName: 'IntAlb',
            securityGroup: intAlbSg,
            vpc: appVpc,
            vpcSubnets: {
                subnetFilters: [
                    ec2.SubnetFilter.byIds([ props.albSubnetId1, props.albSubnetId2 ])
                ]
            }
        });
        intAlb.addListener('IntAlbListener', {
            defaultTargetGroups: [ intTg ],
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP
        });
    }
};
