terraform {
  required_version = "1.14.3"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }

  backend "s3" {
    endpoints = {
      s3 = "https://b49140272491ddf93589b24d6068e36f.r2.cloudflarestorage.com"
    }
    bucket                      = "0xjj-dev-tfstate"
    key                         = "terraform.tfstate"
    region                      = "us-east-1"
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

provider "cloudflare" {
  api_token = var.api_token
}
