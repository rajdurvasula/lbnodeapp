#!/bin/bash -x
mkdir -p /home/ec2-user/projects
aws s3 cp s3://${1}/${2} /home/ec2-user/projects/
cd /home/ec2-user/projects/
unzip ${2}
app_dir=$(basename -- "${2}")
dir_name="${app_dir%.*}"
cd $dir_name
sed -i -e "s~USER~${3}~g" config/config.json
sed -i -e "s~PASSWORD~${4}~g" config/config.json
sed -i -e "s~DBHOST~${5}~g" config/config.json
sed -i -e "s~USER~${3}~g" schema.sql
export MYSQL_PWD=${4}
mysql -h ${5} -u ${3} < schema.sql
npm install
cp test.service /etc/systemd/system/testnode.service
cd $HOME
chown -R ec2-user:ec2-user /home/ec2-user
systemctl daemon-reload
systemctl start testnode
systemctl enable testnode

