#!/bin/bash -x
yum -y update
yum install -y gcc-c++ make git mariadb jq
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
yum -y install nodejs
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install --update
echo "PATH=\$PATH:/usr/local/bin" >> /etc/bashrc
echo "export PATH" >> /etc/bashrc
source ~/.bashrc
PATH=$PATH:/usr/local/bin
export PATH