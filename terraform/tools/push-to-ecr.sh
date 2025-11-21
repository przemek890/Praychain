#!/bin/bash

AWS_REGION="eu-central-1"
AWS_ACCOUNT_ID="506100848058"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

for repo in praychain-nginx praychain-backend praychain-voice; do
    if ! aws ecr describe-repositories --repository-names $repo --region ${AWS_REGION} &>/dev/null; then
        echo "Creating repository: $repo"
        aws ecr create-repository --repository-name $repo --region ${AWS_REGION}
    fi
done

docker tag praychain-nginx:latest ${ECR_REGISTRY}/praychain-nginx:latest
docker push ${ECR_REGISTRY}/praychain-nginx:latest

docker tag praychain-backend:latest ${ECR_REGISTRY}/praychain-backend:latest
docker push ${ECR_REGISTRY}/praychain-backend:latest

docker tag praychain-voice:latest ${ECR_REGISTRY}/praychain-voice:latest
docker push ${ECR_REGISTRY}/praychain-voice:latest

aws ecs update-service \
    --cluster praychain-cluster \
    --service praychain-service \
    --force-new-deployment \
    --region ${AWS_REGION}

echo "Done! ECS will pull new images and redeploy."