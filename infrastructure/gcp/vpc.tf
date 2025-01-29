resource "google_vpc_access_connector" "connector" {
  name          = "main-vpc-connector"
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.name
  region        = var.region
  machine_type  = "f1-micro"
  min_instances = 2
  max_instances = 10
  throughput    = "MODERATE"
}

resource "google_compute_network" "vpc" {
  name                    = "vpc-prod"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "subnet-prod"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
} 