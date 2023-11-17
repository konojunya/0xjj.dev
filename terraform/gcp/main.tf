provider "google" {
  project = var.project_id
  region  = var.default_region
}

resource "google_cloud_run_v2_service" "portfolio" {
  name     = "portfolio"
  location = var.default_region

  template {
    containers {
      image = "asia-northeast1-docker.pkg.dev/${var.project_id}/portfolio/web"
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_cloud_run_v2_service_iam_member" "noauth" {
  location = google_cloud_run_v2_service.portfolio.location
  name     = google_cloud_run_v2_service.portfolio.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
