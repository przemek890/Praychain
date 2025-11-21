variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-central-1"
}

variable "ecr_nginx_image" {
  description = "ECR image URL for nginx reverse proxy"
  type        = string
}

variable "ecr_backend_image" {
  description = "ECR image URL for backend API"
  type        = string
}

variable "ecr_voice_image" {
  description = "ECR image URL for voice verification service"
  type        = string
}