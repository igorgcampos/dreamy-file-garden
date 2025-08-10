# Firestore Native database
resource "google_firestore_database" "database" {
  provider = google-beta
  
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Cost optimization: Point-in-time recovery disabled for dev
  # Enable for production if backup is required
  point_in_time_recovery_enablement = var.environment == "production" ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  
  # Backup configuration for production
  dynamic "cmek_config" {
    for_each = var.environment == "production" ? [1] : []
    content {
      kms_key_name = google_kms_crypto_key.firestore[0].id
    }
  }
}

# Optional: KMS key for Firestore encryption (production only)
resource "google_kms_key_ring" "firestore" {
  count    = var.environment == "production" ? 1 : 0
  name     = "${var.app_name}-firestore"
  location = var.region
}

resource "google_kms_crypto_key" "firestore" {
  count    = var.environment == "production" ? 1 : 0
  name     = "${var.app_name}-firestore-key"
  key_ring = google_kms_key_ring.firestore[0].id
  
  lifecycle {
    prevent_destroy = true
  }
}

# Firestore indexes (add as needed based on your queries)
resource "google_firestore_index" "files_by_user_and_date" {
  provider = google-beta
  
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "files"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "files_by_type" {
  provider = google-beta
  
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "files"

  fields {
    field_path = "mimeType"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}