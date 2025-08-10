#!/bin/bash
# CloudStorage GCP Deployment Script
# Performance-optimized deployment with cost monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_ID=${1:-""}
REGION=${2:-"us-central1"}
ENV=${3:-"production"}

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID is required${NC}"
    echo "Usage: $0 <PROJECT_ID> [REGION] [ENVIRONMENT]"
    echo "Example: $0 my-project-id us-central1 production"
    exit 1
fi

echo -e "${GREEN}🚀 Starting CloudStorage deployment to GCP${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Environment: $ENV"
echo

# Validate gcloud setup
echo -e "${YELLOW}📋 Validating GCP setup...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}Error: No active gcloud authentication found${NC}"
    echo "Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable billing (check only)
echo -e "${YELLOW}💰 Checking billing status...${NC}"
if ! gcloud billing accounts list --format="value(open)" | grep -q "True"; then
    echo -e "${RED}Warning: No active billing account found${NC}"
    echo "Ensure billing is enabled: https://console.cloud.google.com/billing"
fi

# Terraform deployment
echo -e "${YELLOW}🏗️  Deploying infrastructure with Terraform...${NC}"
cd terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars if not exists
if [ ! -f terraform.tfvars ]; then
    echo -e "${YELLOW}📝 Creating terraform.tfvars from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    
    # Update project_id
    sed -i "s/your-gcp-project-id/$PROJECT_ID/g" terraform.tfvars
    sed -i "s/us-central1/$REGION/g" terraform.tfvars
    sed -i "s/production/$ENV/g" terraform.tfvars
    
    echo -e "${YELLOW}⚠️  Please review and update terraform.tfvars with your specific settings${NC}"
    echo "Edit terraform/terraform.tfvars then re-run this script"
    exit 0
fi

# Plan and apply
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="environment=$ENV"

echo -e "${YELLOW}🤔 Do you want to apply these changes? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="environment=$ENV" -auto-approve
else
    echo -e "${YELLOW}❌ Deployment cancelled${NC}"
    exit 0
fi

# Get outputs
CLOUD_RUN_URL=$(terraform output -raw cloud_run_url)
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket)
FILES_BUCKET=$(terraform output -raw files_bucket)
LB_IP=$(terraform output -raw load_balancer_ip)

cd ..

# Build and deploy frontend
echo -e "${YELLOW}🎨 Building frontend...${NC}"
npm install
npm run build

echo -e "${YELLOW}📤 Uploading frontend to Cloud Storage...${NC}"
gsutil -m rsync -r -d dist/ gs://$FRONTEND_BUCKET/

# Set proper cache headers for performance
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$FRONTEND_BUCKET/assets/**
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://$FRONTEND_BUCKET/*.html
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://$FRONTEND_BUCKET/*.js
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$FRONTEND_BUCKET/*.css

# Build and deploy backend
echo -e "${YELLOW}⚙️  Building and deploying backend...${NC}"
cd backend

# Build Docker image
docker build -t gcr.io/$PROJECT_ID/cloudstorage-backend:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/cloudstorage-backend:latest

# Deploy to Cloud Run
gcloud run deploy cloudstorage-backend \
    --image gcr.io/$PROJECT_ID/cloudstorage-backend:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars GCP_PROJECT=$PROJECT_ID,GCP_BUCKET=$FILES_BUCKET,NODE_ENV=production \
    --memory 4Gi \
    --cpu 2 \
    --max-instances 100 \
    --min-instances 1 \
    --timeout 300 \
    --concurrency 1000

cd ..

echo
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo
echo -e "${GREEN}📍 Access your application:${NC}"
echo "   Backend API: $CLOUD_RUN_URL"
echo "   Load Balancer IP: $LB_IP"
echo "   Frontend bucket: gs://$FRONTEND_BUCKET"
echo "   Files bucket: gs://$FILES_BUCKET"
echo
echo -e "${GREEN}📊 Next steps:${NC}"
echo "1. Configure your domain DNS to point to: $LB_IP"
echo "2. Update frontend API URLs to use the load balancer"
echo "3. Monitor costs in GCP Console > Billing"
echo "4. Set up alerting channels in Cloud Monitoring"
echo
echo -e "${YELLOW}💡 Cost optimization tips:${NC}"
echo "• Monitor usage with: gcloud logging read 'resource.type=cloud_run_revision'"
echo "• Set up budget alerts in GCP Console > Billing > Budgets"
echo "• Use lifecycle policies for old files: gsutil lifecycle set lifecycle.json gs://$FILES_BUCKET"
echo
echo -e "${GREEN}✅ Your CloudStorage application is now running on GCP!${NC}"