---
id: c2b7d2cf-2b4a-428d-b761-adba3588656f
title: Terraform Basics (IaC)
type: theory
estimatedMinutes: 30
order: 1
---

# Terraform Basics (IaC)

**Introduction to Terraform HCL syntax. Manage infrastructure state and perform initial provisioning of a simple VM or S3 bucket on a cloud provider.**

---

## What is Terraform?

Terraform is an Infrastructure as Code (IaC) tool that lets you define and provision infrastructure using declarative configuration files.

---

## Basic Syntax

```hcl
# Configure provider
provider "aws" {
  region = "us-east-1"
}

# Create S3 bucket
resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-unique-bucket-name"

  tags = {
    Name        = "My Bucket"
    Environment = "Dev"
  }
}

# Output values
output "bucket_name" {
  value = aws_s3_bucket.my_bucket.id
}
```

---

## Terraform Workflow

1. **Write**: Define resources in .tf files
2. **Init**: `terraform init` - Initialize project
3. **Plan**: `terraform plan` - Preview changes
4. **Apply**: `terraform apply` - Create resources
5. **Destroy**: `terraform destroy` - Remove resources

---

## State Management

Terraform tracks infrastructure state:

- `terraform.tfstate` file
- Records current infrastructure
- Enables updates and deletions

---
