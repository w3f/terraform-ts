# Configure the Docker provider
provider "docker" {
  version = "~> 2.7"
}

# Create a container
resource "docker_container" "foo" {
  image = docker_image.image.latest
  name  = var.name
}

resource "docker_image" "image" {
  name = "nginx:latest"
}
