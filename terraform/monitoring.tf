# Monitoring and logging for cost control and performance
resource "google_monitoring_alert_policy" "high_costs" {
  display_name = "${var.app_name} High Costs Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Cloud Run High Request Rate"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1000  # Alert if more than 1000 requests/minute
      duration        = "300s"
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes
  }

  documentation {
    content = "High request rate detected on Cloud Run service. Check for unusual traffic or potential abuse."
  }
}

# Budget alert for cost control
resource "google_billing_budget" "budget" {
  count = var.monthly_budget > 0 ? 1 : 0
  
  billing_account = var.billing_account
  display_name    = "${var.app_name} Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    
    # Filter by service if needed
    services = [
      "services/F25A-14DD-5BB2",  # Cloud Run
      "services/95FF-2EF5-5EA1",  # Cloud Storage
      "services/A1E8-BE35-7EBC"   # Firestore
    ]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget)
    }
  }

  threshold_rules {
    threshold_percent = 0.5  # Alert at 50%
  }
  
  threshold_rules {
    threshold_percent = 0.8  # Alert at 80%
  }
  
  threshold_rules {
    threshold_percent = 1.0  # Alert at 100%
  }

  all_updates_rule {
    monitoring_notification_channels = var.notification_channels
  }
}

# Performance monitoring dashboard
resource "google_monitoring_dashboard" "performance" {
  dashboard_json = jsonencode({
    displayName = "${var.app_name} Performance Dashboard"
    
    mosaicLayout = {
      tiles = [
        {
          width = 6
          height = 4
          widget = {
            title = "Cloud Run Request Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
                plotType = "LINE"
              }]
              timeshiftDuration = "0s"
              yAxis = {
                label = "Requests/sec"
                scale = "LINEAR"
              }
            }
          }
        }
        {
          width = 6
          height = 4
          xPos = 6
          widget = {
            title = "Cloud Run Latency"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
                    aggregation = {
                      alignmentPeriod = "60s"
                      perSeriesAligner = "ALIGN_DELTA"
                    }
                  }
                }
                plotType = "LINE"
              }]
              yAxis = {
                label = "Latency (ms)"
                scale = "LINEAR"
              }
            }
          }
        }
        {
          width = 12
          height = 4
          yPos = 4
          widget = {
            title = "Storage Usage and Costs"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"gcs_bucket\" AND resource.labels.bucket_name=\"${google_storage_bucket.files.name}\""
                      aggregation = {
                        alignmentPeriod = "3600s"
                        perSeriesAligner = "ALIGN_MEAN"
                      }
                    }
                  }
                  plotType = "LINE"
                }
              ]
              yAxis = {
                label = "Bytes"
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })
}

# Log-based metrics for custom monitoring
resource "google_logging_metric" "error_rate" {
  name   = "${var.app_name}_error_rate"
  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND severity>=ERROR"
  
  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "INT64"
    display_name = "Error Rate"
  }

  value_extractor = "EXTRACT(jsonPayload.level)"
}

# Variables
variable "notification_channels" {
  description = "List of notification channels for alerts"
  type        = list(string)
  default     = []
}

variable "monthly_budget" {
  description = "Monthly budget limit in USD (0 to disable)"
  type        = number
  default     = 100
}

variable "billing_account" {
  description = "Billing account ID for budget alerts"
  type        = string
  default     = ""
}