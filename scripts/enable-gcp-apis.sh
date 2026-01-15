#!/bin/bash
# Enable required Vertex AI APIs for TatT Pro

echo "🔧 Enabling Vertex AI Imagen API..."

# Set project
gcloud config set project tatt-pro

# Enable Vertex AI Imagen API (for image generation)
echo "Enabling aiplatform.googleapis.com (Vertex AI Platform)..."
gcloud services enable aiplatform.googleapis.com

echo "Enabling generativelanguage.googleapis.com (Gemini API)..."
gcloud services enable generativelanguage.googleapis.com

echo ""
echo "✅ All required APIs enabled!"
echo ""
echo "Enabled APIs:"
echo "  - Vertex AI Platform API (Imagen 3, Gemini, Vision, Embeddings)"
echo "  - Generative Language API (Gemini 2.0)"
echo ""
echo "Next: Run 'gcloud services list --enabled' to verify"
