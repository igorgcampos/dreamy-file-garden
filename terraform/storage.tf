# Cloud Storage for file uploads
resource "google_storage_bucket" "files" {
  name     = "${var.project_id}-${var.app_name}-files"
  location = var.region

  # Cost optimization: Multi-regional for high availability
  storage_class = "STANDARD"
  
  labels = local.labels

  # Enable versioning for data protection
  versioning {
    enabled = true
  }

  # Lifecycle management for cost optimization
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # CORS configuration for web uploads
  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # Security: Uniform bucket-level access
  uniform_bucket_level_access = true

  # Public access prevention
  public_access_prevention = "enforced"
}

# Cloud Storage for frontend static files
resource "google_storage_bucket" "frontend" {
  name     = "${var.project_id}-${var.app_name}-frontend"
  location = var.region
  
  labels = local.labels

  # Website configuration
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  # Make frontend bucket publicly readable
  uniform_bucket_level_access = true
}

# Make frontend bucket publicly readable
resource "google_storage_bucket_iam_member" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Service account for Cloud Run to access Storage
resource "google_service_account" "cloudrun" {
  account_id   = "${var.app_name}-cloudrun"
  display_name = "CloudStorage Cloud Run Service Account"
  description  = "Service account for Cloud Run to access GCS and Firestore"
}

# Grant necessary permissions to the service account
resource "google_storage_bucket_iam_member" "cloudrun_files_access" {
  bucket = google_storage_bucket.files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloudrun.email}"
}

resource "google_project_iam_member" "cloudrun_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

resource "google_project_iam_member" "cloudrun_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}