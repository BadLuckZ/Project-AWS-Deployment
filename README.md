# Project-AWS-Deployment

Simple Express + TypeScript backend serving a static frontend, containerized with Docker for AWS deployment.

## Project structure

```
aws-deploy/
├── backend/
│   ├── app.ts          # Express server (routes, static serving)
│   ├── .env            # local environment variables (gitignored)
│   └── .env.example    # template for .env
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 22+
- npm
- Docker (for containerized run)

## Local setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy the env template and adjust if needed:

   ```
   cp backend/.env.example backend/.env
   ```

3. Run in dev mode (auto-restarts on file changes):

   ```
   npm run dev
   ```

4. Open `http://localhost:3000` in a browser. The `/api/status` endpoint is served from the same origin.

## Environment variables

Defined in `backend/.env`:

| Variable   | Description                | Default       |
| ---------- | -------------------------- | ------------- |
| `PORT`     | Port the server listens on | `3000`        |
| `NODE_ENV` | Environment name           | `development` |

## Docker

1. Build the image:

   ```
   docker build -t aws-app .
   ```

2. Run the container. `-p` syntax is `<host-port>:<container-port>` — the container always listens on whatever `PORT` is set to in `backend/.env` (which gets baked into the image at build time). This project keeps `PORT=3000` everywhere (local, Docker, ECS), so host and container port always match:

   ```
   docker run -p 3000:3000 aws-app
   ```

3. Open `http://localhost:3000`.

## AWS Deployment (ECS Express Gateway Service)

### 1. Push image to ECR

Create the ECR repo first, if it doesn't exist yet:

```
aws ecr create-repository --repository-name aws-app --region ap-southeast-2
```

Then log in, tag, and push:

```
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com

docker tag aws-app <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/aws-app:latest
docker push <aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/aws-app:latest
```

> `docker tag` here just adds the ECR-qualified name as a second tag on the same local image — same name (`aws-app`) throughout, so there's nothing to reconcile.

### 2. IAM roles

Two separate roles are needed, with **different trust principals**:

- **Task execution role** — trusted by `ecs-tasks.amazonaws.com` (`trust-policy-app.json` / `trust-policy-tasks.json`):

  ```
  aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy-tasks.json
  aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
  ```

- **Infrastructure role** (for the Express Gateway Service itself) — trusted by `ecs.amazonaws.com`, not `ecs-tasks.amazonaws.com` (`trust-policy-infra.json`). Use the AWS managed policy built for exactly this role, plus CloudWatch Logs (needed for `--monitor-resources`):

  ```
  aws iam create-role --role-name ecsInfrastructureRoleForExpressServices --assume-role-policy-document file://trust-policy-infra.json
  aws iam attach-role-policy --role-name ecsInfrastructureRoleForExpressServices --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices
  aws iam attach-role-policy --role-name ecsInfrastructureRoleForExpressServices --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
  ```

### 3. ECS service-linked role (one-time per account)

Required before creating the first ECS service — if missing, `create-express-gateway-service` fails with `Unable to assume the service linked role`:

```
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
```

### 4. Create the Express Gateway service

```
aws ecs create-express-gateway-service --primary-container image=<aws-account-id>.dkr.ecr.ap-southeast-2.amazonaws.com/aws-app:latest,containerPort=3000 --execution-role-arn arn:aws:iam::<aws-account-id>:role/ecsTaskExecutionRole --infrastructure-role-arn arn:aws:iam::<aws-account-id>:role/ecsInfrastructureRoleForExpressServices --monitor-resources
```

> Replace `<aws-account-id>` with your real 12-digit AWS account ID — don't leave placeholder text in the command, and don't add spaces inside ARNs. Region must match wherever the image was pushed to ECR.

### 5. Find the live URL

**Easiest:** ECS Console → cluster `default` → your service → the service detail page shows the **Service URL** directly.

**Via CLI**, if you'd rather not open the console (the URL isn't part of the `create-express-gateway-service` output, so you have to trace it through the load balancer):

```
# 1. Get the target group ARN from the service's active deployment
aws ecs describe-services --cluster default --services <service-name> \
  --query "services[0].deployments[0].networkConfiguration"

# 2. Find listener rules on the ALB, and look for the rule whose forward action
#    targets your target group ARN — its host-header condition is the live URL
aws elbv2 describe-load-balancers --query "LoadBalancers[].LoadBalancerArn" --output text
aws elbv2 describe-listeners --load-balancer-arn <alb-arn>
aws elbv2 describe-rules --listener-arn <listener-arn>
```

> Note: ECS assigns the service a random suffix (e.g. `aws-app-523f`), and the listener only accepts HTTPS (port 443) with the exact host header from the matching rule — hitting the raw ALB DNS name or guessing a URL pattern returns a 404 from the ALB's default rule, not your app.
