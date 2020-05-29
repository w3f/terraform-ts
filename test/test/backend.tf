terraform {
  backend "gcs" {
    bucket  = "test-tf-state-{{ deploymentName }}"
    prefix  = "terraform/state/{{ clusterName }}"
  }
}
