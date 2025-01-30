variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the cluster"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "node_count" {
  description = "Number of nodes in the GKE cluster"
  type        = number
  default     = 3
}

variable "authorized_network_cidr" {
  description = "CIDR block for authorized networks to access the cluster"
  type        = string
  default     = "10.0.0.0/8"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "gobeze-ai-primary-cluster"
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
  default     = "gobeze-ai-vpc"
}

variable "subnet_name" {
  description = "Name of the subnet"
  type        = string
  default     = "gobeze-ai-subnet"
}

variable "pod_ip_range_name" {
  description = "Name of the secondary IP range for pods"
  type        = string
  default     = "pod-ip-range"
}

variable "svc_ip_range_name" {
  description = "Name of the secondary IP range for services"
  type        = string
  default     = "svc-ip-range"
} 