# Storage Module Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "enable_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true
}

variable "enable_encryption" {
  description = "Enable S3 server-side encryption"
  type        = bool
  default     = true
}

variable "intelligent_tiering" {
  description = "Enable S3 Intelligent Tiering for automatic cost optimization"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for cost optimization"
  type = object({
    transition_to_ia_days      = number
    transition_to_glacier_days = number
    expiration_days           = number
  })
  default = {
    transition_to_ia_days      = 30
    transition_to_glacier_days = 90
    expiration_days           = 0  # 0 means no expiration
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}