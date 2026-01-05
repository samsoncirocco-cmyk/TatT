/**
 * Script to list Railway projects and services
 * Helps identify which project is running the backend
 */

import dotenv from 'dotenv';

dotenv.config();

const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v1';

if (!RAILWAY_API_TOKEN) {
  console.error('❌ RAILWAY_API_TOKEN is required in .env file');
  process.exit(1);
}

async function railwayGraphQL(query, variables = {}) {
  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Railway API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Railway GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

async function listProjects() {
  const query = `
    query {
      projects {
        edges {
          node {
            id
            name
            description
            createdAt
            services {
              edges {
                node {
                  id
                  name
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `;

  return railwayGraphQL(query);
}

async function main() {
  try {
    console.log('🚂 Listing Railway Projects...\n');

    const data = await listProjects();
    const projects = data.projects.edges.map(edge => edge.node);

    if (projects.length === 0) {
      console.log('No projects found.');
      return;
    }

    console.log(`Found ${projects.length} project(s):\n`);

    projects.forEach((project, index) => {
      const services = project.services.edges.map(e => e.node);
      console.log(`${index + 1}. ${project.name || 'Unnamed Project'}`);
      console.log(`   ID: ${project.id}`);
      if (project.description) {
        console.log(`   Description: ${project.description}`);
      }
      console.log(`   Created: ${new Date(project.createdAt).toLocaleDateString()}`);
      console.log(`   Services: ${services.length}`);
      
      if (services.length > 0) {
        services.forEach(service => {
          console.log(`      - ${service.name} (${service.id})`);
        });
      }
      console.log('');
    });

    // Check for projects that might be the backend
    const backendCandidates = projects.filter(p => {
      const services = p.services.edges.map(e => e.node);
      return services.some(s => 
        s.name.toLowerCase().includes('server') ||
        s.name.toLowerCase().includes('backend') ||
        s.name.toLowerCase().includes('api') ||
        s.name.toLowerCase().includes('tatt')
      );
    });

    if (backendCandidates.length > 0) {
      console.log('💡 Likely backend projects:');
      backendCandidates.forEach(p => {
        console.log(`   - ${p.name} (${p.id})`);
      });
      console.log('');
    }

    // Show the two project IDs from the URLs
    console.log('📋 Project IDs from your URLs:');
    console.log('   1. a0fa4f56-541e-4b6e-9760-c0975d382020');
    console.log('   2. 6c984fbf-b5e0-4ae0-b59e-5cd8e82a1688');
    console.log('');
    console.log('💡 To identify which is the backend:');
    console.log('   - Check which project has a service running on port 3001');
    console.log('   - Check which project has environment variables like REPLICATE_API_TOKEN');
    console.log('   - Check Railway logs to see which one is running server.js');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Make sure your RAILWAY_API_TOKEN is valid');
      console.error('   Get a new token from: https://railway.app/account/tokens');
    }
    
    process.exit(1);
  }
}

main();

