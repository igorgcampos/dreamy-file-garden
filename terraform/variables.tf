# CloudStorage AWS Migration - Variables Configuration
# Cost-optimized variables with sensible defaults

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "cloudstorage"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"  # Cheapest region for most services
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate in ACM (must be in us-east-1 for CloudFront)"
  type        = string
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database Configuration
variable "docdb_instance_class" {
  description = "DocumentDB instance class - optimized for cost"
  type        = string
  default     = "db.t3.medium"  # Good balance of performance and cost
}

variable "docdb_instance_count" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 1  # Start with 1, scale as needed
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# S3 Configuration
variable "s3_versioning" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules for cost optimization"
  type = object({
    transition_to_ia_days      = number
    transition_to_glacier_days = number
    expiration_days           = number
  })
  default = {
    transition_to_ia_days      = 30   # Move to IA after 30 days
    transition_to_glacier_days = 90   # Move to Glacier after 90 days  
    expiration_days           = 365   # Delete after 1 year (adjust as needed)
  }
}

# Container Images
variable "frontend_image" {
  description = "Frontend Docker image"
  type        = string
  default     = "cloudstorage-frontend:latest"
}

variable "backend_image" {
  description = "Backend Docker image"
  type        = string
  default     = "cloudstorage-backend:latest"
}

# ECS Task Sizing - Cost optimized
variable "frontend_cpu" {
  description = "Frontend task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 256  # 0.25 vCPU - sufficient for React app
}

variable "frontend_memory" {
  description = "Frontend task memory in MB"
  type        = number
  default     = 512  # 512 MB
}

variable "backend_cpu" {
  description = "Backend task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 512  # 0.5 vCPU
}

variable "backend_memory" {
  description = "Backend task memory in MB"
  type        = number
  default     = 1024  # 1 GB
}

# Auto Scaling Configuration
variable "backend_min_capacity" {
  description = "Minimum number of backend tasks"
  type        = number
  default     = 2  # For high availability
}

variable "backend_max_capacity" {
  description = "Maximum number of backend tasks"
  type        = number
  default     = 10  # Reasonable upper limit
}

variable "backend_target_cpu" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70  # Scale up at 70% CPU
}

variable "backend_target_memory" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80  # Scale up at 80% memory
}

# Application Configuration
variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

# Monitoring and Alerting
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
}

variable "alert_cpu_threshold" {
  description = "CPU threshold for alerts (percentage)"
  type        = number
  default     = 80
}

variable "alert_memory_threshold" {
  description = "Memory threshold for alerts (percentage)"
  type        = number
  default     = 85
}

variable "alert_error_rate_threshold" {
  description = "Error rate threshold for alerts (percentage)"
  type        = number
  default     = 5
}

# Cost Control Tags
variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

variable "auto_shutdown_schedule" {
  description = "Enable automatic shutdown for non-prod environments"
  type        = bool
  default     = false
}