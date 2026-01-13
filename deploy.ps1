# Pull latest changes
git pull

# Define container and image names
$containerName = "es5-immich-slideshow"
$imageName = "es5-immich-slideshow"

# Stop and remove existing container if it exists
if (docker ps -a -q -f name=$containerName) {
    Write-Host "Stopping and removing existing container..."
    docker stop $containerName
    docker rm $containerName
}

# Build the Docker image
Write-Host "Building Docker image..."
docker build -t $imageName .

# Run the new container
Write-Host "Starting new container on port 7890..."
docker run -d -p 7890:80 --name $containerName $imageName

Write-Host "Deployment complete! Access at http://localhost:7890"
