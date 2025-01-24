# Service account for Cloud SQL
resource "google_service_account" "cloudsql_sa" {
  account_id   = "${var.cluster_name}-sql-sa"
  display_name = "Cloud SQL Service Account for ${var.cluster_name}"
}

# Grant necessary permissions
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudsql_sa.email}"
}

# Create Cloud SQL instance
resource "google_sql_database_instance" "main" {
  name             = "${var.cluster_name}-db"
  database_version = "POSTGRES_14"
  region           = var.region
  
  deletion_protection = true

  settings {
    tier              = "db-custom-2-4096" # 2 vCPUs, 4GB RAM
    availability_type = "REGIONAL"
    
    backup_configuration {
      enabled                        = true
      start_time                    = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
      require_ssl                                   = true
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length    = 1024
      record_application_tags = true
      record_client_address  = false
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 2  # 2 AM
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "300000" # 5 minutes in milliseconds
    }
  }
}

# Create main database
resource "google_sql_database" "main_db" {
  name      = "gobeze_ai"
  instance  = google_sql_database_instance.main.name
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

# Create databases for different environments
resource "google_sql_database" "env_dbs" {
  for_each = toset(["dev", "staging", "test"])
  
  name      = "gobeze_ai_${each.key}"
  instance  = google_sql_database_instance.main.name
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

# Create application user
resource "google_sql_user" "app_user" {
  name     = "gobeze_ai_app"
  instance = google_sql_database_instance.main.name
  password = random_password.app_db_password.result
}

# Create admin user
resource "google_sql_user" "admin_user" {
  name     = "gobeze_ai_admin"
  instance = google_sql_database_instance.main.name
  password = random_password.admin_db_password.result
}

# Generate secure passwords
resource "random_password" "app_db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "admin_db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store passwords in Secret Manager
resource "google_secret_manager_secret" "app_db_password" {
  secret_id = "${var.cluster_name}-app-db-password"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "app_db_password" {
  secret      = google_secret_manager_secret.app_db_password.id
  secret_data = random_password.app_db_password.result
}

resource "google_secret_manager_secret" "admin_db_password" {
  secret_id = "${var.cluster_name}-admin-db-password"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "admin_db_password" {
  secret      = google_secret_manager_secret.admin_db_password.id
  secret_data = random_password.admin_db_password.result
}

# IAM binding for Secret Manager access
resource "google_secret_manager_secret_iam_member" "app_secret_access" {
  secret_id = google_secret_manager_secret.app_db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudsql_sa.email}"
}

# Cloud SQL Proxy configuration
resource "google_service_account_key" "cloudsql_key" {
  service_account_id = google_service_account.cloudsql_sa.name
}

# Create a secret for the service account key
resource "google_secret_manager_secret" "cloudsql_key" {
  secret_id = "${var.cluster_name}-sql-key"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "cloudsql_key" {
  secret      = google_secret_manager_secret.cloudsql_key.id
  secret_data = base64decode(google_service_account_key.cloudsql_key.private_key)
} 