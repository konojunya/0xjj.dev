provider "google" {
  project = var.project_id
  region  = var.default_region
}

## Cloud Run
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

## Workload Identity
resource "google_iam_workload_identity_pool" "github_actions_pool" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "github-actions-pool"
  description               = "Pool for GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "github-actions"
  description                        = "GitHub Actions"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

data "google_service_account" "deployer" {
  account_id = var.deployer_service_account
}

resource "google_service_account_iam_member" "deployer" {
  service_account_id = data.google_service_account.deployer.id
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions_pool.name}/attribute.repository/konojunya/0xjj.dev"
}
