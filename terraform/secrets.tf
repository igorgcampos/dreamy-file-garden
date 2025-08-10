# Secret Manager for sensitive configuration
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${var.app_name}-jwt-secret"
  
  labels = local.labels

  replication {
    auto {
      # Use automatic replication for high availability
    }
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret = google_secret_manager_secret.jwt_secret.id
  
  # Generate a secure random JWT secret
  secret_data = random_password.jwt_secret.result
}

resource "google_secret_manager_secret" "jwt_refresh_secret" {
  secret_id = "${var.app_name}-jwt-refresh-secret"
  
  labels = local.labels

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_refresh_secret" {
  secret = google_secret_manager_secret.jwt_refresh_secret.id
  secret_data = random_password.jwt_refresh_secret.result
}

# Optional: Google OAuth secrets (if using Google login)
resource "google_secret_manager_secret" "google_client_id" {
  count     = var.enable_google_oauth ? 1 : 0
  secret_id = "${var.app_name}-google-client-id"
  
  labels = local.labels

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_client_id" {
  count       = var.enable_google_oauth ? 1 : 0
  secret      = google_secret_manager_secret.google_client_id[0].id
  secret_data = var.google_client_id
}

resource "google_secret_manager_secret" "google_client_secret" {
  count     = var.enable_google_oauth ? 1 : 0
  secret_id = "${var.app_name}-google-client-secret"
  
  labels = local.labels

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_client_secret" {
  count       = var.enable_google_oauth ? 1 : 0
  secret      = google_secret_manager_secret.google_client_secret[0].id
  secret_data = var.google_client_secret
}

# Generate secure random passwords
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

resource "random_password" "jwt_refresh_secret" {
  length  = 32
  special = true
}

# Variables for Google OAuth (optional)
variable "enable_google_oauth" {
  description = "Enable Google OAuth integration"
  type        = bool
  default     = false
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}