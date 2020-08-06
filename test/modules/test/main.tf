# Configure the Docker provider
provider "docker" {
  version = "~> 2.7"
}

# Create a container
resource "docker_container" "foo" {
  image = docker_image.ubuntu.latest
  name  = "test"
}

resource "docker_image" "ubuntu" {
  name = "nginx:latest"
}
