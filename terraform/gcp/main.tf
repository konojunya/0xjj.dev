provider "google" {
  project = var.project_id
  region  = var.default_region
}

provider "google-beta" {
  project = var.project_id
  region  = var.default_region
}

## IAM
### GitHub Actions Service Account(eg. Cloud Run deploy from GitHub Actions)
resource "google_service_account" "github_actions" {
  account_id   = "github-actions"
  display_name = "GitHub Actions Service Account"
  description  = "Service Account for GitHub Actions"
}

resource "google_service_account_iam_binding" "github_actions" {
  service_account_id = google_service_account.github_actions.name
  members            = ["serviceAccount:${google_service_account.github_actions.email}"]
  role               = "roles/iam.serviceAccountUser"
}

resource "google_cloud_run_v2_service_iam_member" "github_actions" {
  name     = google_cloud_run_v2_service.portfolio.name
  location = var.default_region
  project  = var.project_id
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_artifact_registry_repository_iam_member" "github_actions" {
  project    = var.project_id
  location   = var.default_region
  repository = google_artifact_registry_repository.portfolio.name
  role       = "roles/artifactregistry.admin"
  member     = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_service_account_iam_member" "github_actions" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions_pool.name}/attribute.repository/konojunya/0xjj.dev"
}

## Artifact Registry
resource "google_artifact_registry_repository" "portfolio" {
  provider               = "google-beta"
  location               = var.default_region
  repository_id          = "portfolio"
  description            = "Portfolio"
  format                 = "DOCKER"
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep_minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
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
      max_instance_count = 1
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}
## NOTE: multi container
# resource "google_cloud_run_v2_service" "portfolio" {
#   provider = google-beta
#   name     = "portfolio"
#   location = var.default_region
#   ingress  = "INGRESS_TRAFFIC_ALL"

#   template {
#     containers {
#       name = "app"
#       ports {
#         container_port = 3000
#       }
#       image      = "asia-northeast1-docker.pkg.dev/${var.project_id}/portfolio/web"
#       depends_on = ["nginx"]
#     }

#     containers {
#       name = "nginx"
#       ports {
#         container_port = 8080
#       }
#       image = "asia-northeast1-docker.pkg.dev/${var.project_id}/portfolio/nginx"
#     }

#     scaling {
#       min_instance_count = 0
#       max_instance_count = 1
#     }
#   }

#   traffic {
#     type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
#     percent = 100
#   }
# }

# resource "google_cloud_run_v2_service_iam_member" "noauth" {
#   location = google_cloud_run_v2_service.portfolio.location
#   name     = google_cloud_run_v2_service.portfolio.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

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
  attribute_condition                = "assertion.repository_owner == 'konojunya'"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.aud"        = "assertion.aud"
    "attribute.repository" = "assertion.repository"
  }
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
