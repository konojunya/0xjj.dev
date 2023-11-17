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

variable "deployer_service_account" {
  description = "Deploy service account"
  type        = string
  default     = "deployer_service_account"
}
