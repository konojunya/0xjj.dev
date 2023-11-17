variable "project_id" {
  description = "project id"
  type        = string
  default     = "project_id"
}

variable "default_region" {
  description = "default region"
  type        = string
  default     = "asia-northeast1"
}

locals {
  github_repo_owner = "konojunya"
  github_repo_name  = "0xjj.dev"
}
