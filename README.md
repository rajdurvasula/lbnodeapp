# CDK TypeScript project - Node App with RDS MariaDB backend

This is project deploys:
- 2 EC2 Instances, 1 each in an Availability Zone
- 1 RDS MariaDB Instance
- 1 Internal AWS ALB

## Depoyment
> MUST upate Context Keys based on your environment
- Context Keys
  - appVpcId
  - albSubnetId1
  - albSubnetId2
  - appInstanceSubnetId1
  - appInstanceSubnetId2
  - dbSubnetId1
  - dbSubnetId2
  - privateRtbId,
  - tgwId

- Mandatory Parameters
```
cdk deploy --parameters InboundCidr=11.0.0.0/16 --parameters AppDBUser=appuser --parameters AppDBPwd=s3cr3t123 --parameters AppBucket=rd-dd-dev-bucket1 --parameters AppKey=nodejs_mysql.zip
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
