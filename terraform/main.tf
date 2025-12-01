terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"

  # Remote state w S3 - wymagane dla CI/CD
  backend "s3" {
    bucket = "praychain-terraform-state"
    key    = "terraform.tfstate"
    region = "eu-central-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "praychain-vpc"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "praychain-public-${count.index + 1}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "praychain-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "praychain-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group for ECS
resource "aws_security_group" "ecs" {
  name        = "praychain-ecs-sg"
  description = "Security group for PrayChain ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "praychain-ecs-sg"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "praychain" {
  name = "praychain-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "praychain-cluster"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "praychain" {
  name              = "/ecs/praychain"
  retention_in_days = 7

  tags = {
    Name = "praychain-logs"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_execution" {
  name = "praychain-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "praychain-ecs-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "ecs_task_ssm" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# ECS Task Definition
resource "aws_ecs_task_definition" "praychain" {
  family                   = "praychain"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.voice_verification_enabled ? "1024" : "512"
  memory                   = var.voice_verification_enabled ? "2048" : "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode(concat(
    [
      {
        name      = "backend"
        image     = var.ecr_backend_image
        essential = true
        cpu       = var.voice_verification_enabled ? 384 : 384
        memory    = var.voice_verification_enabled ? 768 : 768

        portMappings = [{
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }]

        environment = [
          {
            name  = "VOICE_VERIFICATION_ENABLED"
            value = var.voice_verification_enabled ? "true" : "false"
          },
          {
            name  = "VOICE_SERVICE_URL"
            value = "http://localhost:8001"
          },
          {
            name  = "MONGODB_URL"
            value = var.mongodb_url
          },
          {
            name  = "HF_API_KEY"
            value = var.hf_api_key
          }
        ]

        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.praychain.name
            "awslogs-region"        = var.aws_region
            "awslogs-stream-prefix" = "backend"
          }
        }
      },
      {
        name      = "nginx"
        image     = var.ecr_nginx_image
        essential = true
        cpu       = var.voice_verification_enabled ? 128 : 128
        memory    = var.voice_verification_enabled ? 256 : 256

        portMappings = [{
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }]

        dependsOn = concat(
          [{
            containerName = "backend"
            condition     = "START"
          }],
          var.voice_verification_enabled ? [{
            containerName = "voice-service"
            condition     = "START"
          }] : []
        )

        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.praychain.name
            "awslogs-region"        = var.aws_region
            "awslogs-stream-prefix" = "nginx"
          }
        }
      }
    ],
    var.voice_verification_enabled ? [{
      name      = "voice-service"
      image     = var.ecr_voice_image
      essential = false
      cpu       = 512
      memory    = 1024

      portMappings = [{
        containerPort = 8001
        hostPort      = 8001
        protocol      = "tcp"
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.praychain.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "voice-service"
        }
      }
    }] : []
  ))

  tags = {
    Name = "praychain-task"
  }
}

# ECS Service
resource "aws_ecs_service" "praychain" {
  name            = "praychain-service"
  cluster         = aws_ecs_cluster.praychain.id
  task_definition = aws_ecs_task_definition.praychain.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution_policy,
    aws_iam_role_policy_attachment.ecs_task_ssm
  ]

  tags = {
    Name = "praychain-service"
  }
}