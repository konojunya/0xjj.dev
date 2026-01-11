resource "cloudflare_r2_bucket" "tfstate" {
  account_id = var.account_id
  name       = "0xjj-dev-tfstate"
}

resource "cloudflare_r2_bucket" "assets" {
  account_id = var.account_id
  name       = "0xjj-dev-assets"
}