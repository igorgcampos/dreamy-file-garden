# Outputs for deployment and configuration
output "cloud_run_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "load_balancer_ip" {
  description = "IP address of the load balancer"
  value       = google_compute_global_address.default.address
}

output "frontend_bucket" {
  description = "Frontend assets bucket name"
  value       = google_storage_bucket.frontend.name
}

output "files_bucket" {
  description = "Files storage bucket name"
  value       = google_storage_bucket.files.name
}

output "service_account_email" {
  description = "Service account email for Cloud Run"
  value       = google_service_account.cloudrun.email
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.database.name
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

# Configuration for deployment scripts
output "deployment_config" {
  description = "Configuration for deployment automation"
  value = {
    project_id           = var.project_id
    region              = var.region
    service_name        = google_cloud_run_v2_service.backend.name
    service_account     = google_service_account.cloudrun.email
    files_bucket        = google_storage_bucket.files.name
    frontend_bucket     = google_storage_bucket.frontend.name
    load_balancer_ip    = google_compute_global_address.default.address
    cloud_run_url       = google_cloud_run_v2_service.backend.uri
  }
  sensitive = false
}

# Cost estimation outputs
output "estimated_monthly_costs" {
  description = "Estimated monthly costs breakdown"
  value = {
    cloud_run          = "20-80 USD (based on requests)"
    cloud_storage      = "5-30 USD (based on storage and transfer)"
    firestore         = "10-50 USD (based on operations)"
    load_balancer     = "18 USD (fixed)"
    networking        = "5-15 USD (based on traffic)"
    total_estimated   = "58-193 USD per month"
    notes            = "Costs vary based on actual usage. Monitor with billing alerts."
  }
}

# Performance benchmarks
output "performance_targets" {
  description = "Performance targets and expectations"
  value = {
    cold_start_latency    = "< 2s"
    warm_request_latency  = "< 200ms"
    file_upload_throughput = "Up to 100MB/s"
    max_concurrent_users  = "1000+"
    auto_scaling_max     = "100 instances"
    availability_target  = "99.9%"
  }
}