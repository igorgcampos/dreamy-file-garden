# Cloud Run service for the backend API
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.app_name}-backend"
  location = var.region
  
  labels = local.labels

  template {
    # Performance optimization
    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0  # Keep 1 warm instance in prod
      max_instance_count = 100
    }

    # Container configuration
    containers {
      image = "gcr.io/${var.project_id}/${var.app_name}-backend:latest"
      
      # Resource limits for cost control
      resources {
        limits = {
          cpu    = "2"       # 2 vCPU
          memory = "4Gi"     # 4GB RAM - good for file processing
        }
        cpu_idle = true      # CPU throttling when idle
        startup_cpu_boost = true  # Faster cold starts
      }

      ports {
        container_port = 3001
      }

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_BUCKET"
        value = google_storage_bucket.files.name
      }

      env {
        name  = "PORT"
        value = "3001"
      }

      env {
        name  = "PUBLIC_URL"
        value = "https://${google_cloud_run_v2_service.backend.uri}"
      }

      # Secrets from Secret Manager
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_REFRESH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_refresh_secret.secret_id
            version = "latest"
          }
        }
      }

      # Health check
      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 10
        timeout_seconds = 1
        period_seconds = 3
        failure_threshold = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 30
        timeout_seconds = 1
        period_seconds = 10
        failure_threshold = 3
      }
    }

    # Service account for GCS and Firestore access
    service_account = google_service_account.cloudrun.email

    # Performance tuning
    timeout = "300s"  # 5 minutes for large file uploads
    
    # Network and security
    vpc_access {
      # Use default VPC for now, can be customized later
      egress = "ALL_TRAFFIC"
    }
  }

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.required_apis,
    google_storage_bucket.files,
    google_firestore_database.database,
    google_secret_manager_secret_version.jwt_secret,
    google_secret_manager_secret_version.jwt_refresh_secret
  ]
}

# Allow public access to Cloud Run
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer for custom domain and HTTPS
resource "google_compute_global_address" "default" {
  name = "${var.app_name}-ip"
}

resource "google_compute_managed_ssl_certificate" "default" {
  count = var.environment == "production" ? 1 : 0
  name  = "${var.app_name}-ssl-cert"

  managed {
    domains = [var.custom_domain != "" ? var.custom_domain : "${var.app_name}.example.com"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# URL map for routing
resource "google_compute_url_map" "default" {
  name            = "${var.app_name}-urlmap"
  default_service = google_compute_backend_service.backend.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_service.backend.id

    # Route static assets to Cloud Storage
    path_rule {
      paths   = ["/static/*", "/assets/*"]
      service = google_compute_backend_bucket.frontend.id
    }
  }
}

# Backend service for Cloud Run
resource "google_compute_backend_service" "backend" {
  name        = "${var.app_name}-backend-service"
  protocol    = "HTTP"
  timeout_sec = 300

  backend {
    group = google_compute_region_network_endpoint_group.cloudrun_neg.id
  }

  # Health check
  health_checks = [google_compute_health_check.backend.id]

  # Performance optimization
  log_config {
    enable      = true
    sample_rate = 0.1  # 10% sampling for cost optimization
  }
}

# Network Endpoint Group for Cloud Run
resource "google_compute_region_network_endpoint_group" "cloudrun_neg" {
  name                  = "${var.app_name}-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

# Backend bucket for static assets
resource "google_compute_backend_bucket" "frontend" {
  name        = "${var.app_name}-frontend-backend"
  bucket_name = google_storage_bucket.frontend.name
}

# Health check
resource "google_compute_health_check" "backend" {
  name = "${var.app_name}-health-check"

  http_health_check {
    request_path = "/health"
    port         = "3001"
  }

  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "default" {
  count   = var.environment == "production" ? 1 : 0
  name    = "${var.app_name}-https-proxy"
  url_map = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default[0].id]
}

# HTTP proxy (for development or redirect to HTTPS)
resource "google_compute_target_http_proxy" "default" {
  name    = "${var.app_name}-http-proxy"
  url_map = google_compute_url_map.default.id
}

# Forwarding rules
resource "google_compute_global_forwarding_rule" "https" {
  count      = var.environment == "production" ? 1 : 0
  name       = "${var.app_name}-https-rule"
  target     = google_compute_target_https_proxy.default[0].id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

resource "google_compute_global_forwarding_rule" "http" {
  name       = "${var.app_name}-http-rule"
  target     = google_compute_target_http_proxy.default.id
  port_range = "80"
  ip_address = google_compute_global_address.default.address
}

# Custom domain variable
variable "custom_domain" {
  description = "Custom domain for the application"
  type        = string
  default     = ""
}