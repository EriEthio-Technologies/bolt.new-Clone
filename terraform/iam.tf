# Create GKE service account
resource "google_service_account" "gke_sa" {
  account_id   = "${var.cluster_name}-gke-sa"
  display_name = "GKE Service Account for ${var.cluster_name}"
}

# Grant necessary permissions
resource "google_project_iam_member" "gke_permissions" {
  for_each = toset([
    "roles/container.nodeServiceAccount",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/logging.logWriter",
    "roles/stackdriver.resourceMetadata.writer"
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.gke_sa.email}"
}

# Workload Identity IAM binding
resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.gke_sa.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[default/default]"
  ]
} 