terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
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
  vpc_id                  = aws_vpc.main.id  # ✅ POPRAWIONE - dodane "aws_vpc"
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

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  # Backend port (internal)
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    self        = true
    description = "Backend internal communication"
  }

  # Voice service port (internal)
  ingress {
    from_port   = 8001
    to_port     = 8001
    protocol    = "tcp"
    self        = true
    description = "Voice service internal communication"
  }

  # Allow all internal traffic between containers
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
    description = "Internal container communication"
  }

  # Outbound - allow all
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
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
  cpu                      = "1024"  # ✅ ZMNIEJSZONE z 2048 na 1024 (1 vCPU)
  memory                   = "2048"  # ✅ ZMNIEJSZONE z 4096 na 2048 (2 GB RAM)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "nginx"
      image     = var.ecr_nginx_image
      essential = true
      cpu       = 128      # ✅ ZMNIEJSZONE z 256
      memory    = 256      # ✅ ZMNIEJSZONE z 512

      portMappings = [{
        containerPort = 80
        hostPort      = 80
        protocol      = "tcp"
      }]

      dependsOn = [
        {
          containerName = "backend"
          condition     = "START"
        },
        {
          containerName = "voice-service"
          condition     = "START"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.praychain.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nginx"
        }
      }
    },
    {
      name      = "backend"
      image     = var.ecr_backend_image
      essential = true
      cpu       = 512      # ✅ ZMNIEJSZONE z 1024
      memory    = 1024     # ✅ ZMNIEJSZONE z 2048

      portMappings = [{
        containerPort = 8000
        hostPort      = 8000
        protocol      = "tcp"
      }]

      environment = [
        {
          name  = "VOICE_VERIFICATION_ENABLED"
          value = "true"
        },
        {
          name  = "VOICE_SERVICE_URL"
          value = "http://localhost:8001"
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
      name      = "voice-service"
      image     = var.ecr_voice_image
      essential = true
      cpu       = 384      # ✅ ZMNIEJSZONE z 768
      memory    = 768      # ✅ ZMNIEJSZONE z 1536

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
    }
  ])

  tags = {
    Name = "praychain-task"
  }
}

# ECS Service
resource "aws_ecs_service" "praychain" {
  name            = "praychain-service"
  cluster         = aws_ecs_cluster.praychain.id
  task_definition = aws_ecs_task_definition.praychain.arn
  desired_count   = 1  # ✅ POZOSTAJE 1 task
  launch_type     = "FARGATE"

  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution_policy,
    aws_iam_role_policy_attachment.ecs_task_ssm
  ]

  tags = {
    Name = "praychain-service"
  }
}