// Setup core infrastructure
resource "google_project_service" "services" {
  for_each = toset([
    "compute.googleapis.com",
    "containerregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com"
  ])
  service = each.key
} 