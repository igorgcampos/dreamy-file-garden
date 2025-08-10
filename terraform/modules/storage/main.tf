# S3 Storage Module - Cost Optimized with Intelligent Tiering

resource "aws_s3_bucket" "main" {
  bucket = "${var.name_prefix}-files-${random_string.bucket_suffix.result}"
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-main-bucket"
    Type = "FileStorage"
  })
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"  # Most cost-effective encryption
    }
    bucket_key_enabled = true
  }
}

# Block public access (security best practice)
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration for web app
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
    allowed_origins = ["*"]  # Restrict this to your domain in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Intelligent Tiering for automatic cost optimization
resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  count  = var.intelligent_tiering ? 1 : 0
  bucket = aws_s3_bucket.main.id
  name   = "EntireBucket"

  status = "Enabled"

  # Optional: Archive configurations for deep cost savings
  optional_fields {
    bucket_key_enabled = true
  }

  # Archive Access Tier (90-270 days)
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  # Deep Archive Access Tier (180+ days)  
  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

# Lifecycle configuration for manual tiering (if intelligent tiering not used)
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  depends_on = [aws_s3_bucket_versioning.main]
  bucket     = aws_s3_bucket.main.id

  # Current version transitions
  rule {
    id     = "cost_optimization"
    status = "Enabled"

    # Transition current versions
    transition {
      days          = var.lifecycle_rules.transition_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.lifecycle_rules.transition_to_glacier_days
      storage_class = "GLACIER"
    }

    # Expire current versions (optional, be careful with this)
    dynamic "expiration" {
      for_each = var.lifecycle_rules.expiration_days > 0 ? [1] : []
      content {
        days = var.lifecycle_rules.expiration_days
      }
    }

    # Handle non-current versions (if versioning enabled)
    dynamic "noncurrent_version_transition" {
      for_each = var.enable_versioning ? [1] : []
      content {
        noncurrent_days = 30
        storage_class   = "STANDARD_IA"
      }
    }

    dynamic "noncurrent_version_transition" {
      for_each = var.enable_versioning ? [1] : []
      content {
        noncurrent_days = 60
        storage_class   = "GLACIER"
      }
    }

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CloudWatch metrics for monitoring storage costs
resource "aws_cloudwatch_metric_alarm" "storage_cost" {
  alarm_name          = "${var.name_prefix}-s3-storage-cost"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400"  # Daily
  statistic           = "Average"
  threshold           = "10737418240"  # 10 GB in bytes
  alarm_description   = "This metric monitors S3 storage usage"
  alarm_actions       = []  # Add SNS topic ARN if you want notifications

  dimensions = {
    BucketName  = aws_s3_bucket.main.bucket
    StorageType = "StandardStorage"
  }

  tags = var.tags
}

# Bucket notification for Lambda triggers (if needed)
# Uncomment if you need to process uploaded files
/*
resource "aws_s3_bucket_notification" "main" {
  bucket = aws_s3_bucket.main.id

  lambda_function {
    lambda_function_arn = var.lambda_processor_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = ""
    filter_suffix       = ""
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}
*/