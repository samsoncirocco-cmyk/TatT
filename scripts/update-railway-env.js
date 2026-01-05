/**
 * Script to update Railway environment variables via API
 * 
 * Usage:
 *   node scripts/update-railway-env.js
 * 
 * Requires:
 *   - RAILWAY_API_TOKEN in environment or .env file
 *   - RAILWAY_PROJECT_ID in environment or .env file
 *   - RAILWAY_SERVICE_ID in environment or .env file (optional, will use first service if not provided)
 */

import dotenv from 'dotenv';

dotenv.config();

const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
// Support multiple project IDs (comma-separated) - will try each until one works
const RAILWAY_PROJECT_IDS = process.env.RAILWAY_PROJECT_ID 
  ? process.env.RAILWAY_PROJECT_ID.split(',').map(id => id.trim())
  : ['a0fa4f56-541e-4b6e-9760-c0975d382020', '6c984fbf-b5e0-4ae0-b59e-5cd8e82a1688'];
const RAILWAY_SERVICE_ID = process.env.RAILWAY_SERVICE_ID;
const VERCEL_URL = process.env.VERCEL_URL || 'https://tat-t-3x8t.vercel.app';

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v1';

if (!RAILWAY_API_TOKEN) {
  console.error('❌ RAILWAY_API_TOKEN is required');
  console.error('   Get it from: https://railway.app/account/tokens');
  process.exit(1);
}

if (RAILWAY_PROJECT_IDS.length === 0) {
  console.error('❌ RAILWAY_PROJECT_ID is required');
  console.error('   Find it in your Railway project URL or dashboard');
  process.exit(1);
}

/**
 * Make a GraphQL request to Railway API
 */
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

/**
 * Get project services
 */
async function getServices(projectId) {
  const query = `
    query GetProject($id: String!) {
      project(id: $id) {
        services {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `;

  const data = await railwayGraphQL(query, { id: projectId });
  return data.project.services.edges.map(edge => edge.node);
}

/**
 * Get current environment variables for a service
 */
async function getEnvironmentVariables(serviceId) {
  const query = `
    query GetVariables($serviceId: String!) {
      variables(serviceId: $serviceId) {
        edges {
          node {
            name
            value
          }
        }
      }
    }
  `;

  const data = await railwayGraphQL(query, { serviceId });
  return data.variables.edges.map(edge => edge.node);
}

/**
 * Update or create an environment variable
 */
async function setEnvironmentVariable(serviceId, name, value) {
  const query = `
    mutation SetVariable($input: VariableUpsertInput!) {
      variableUpsert(input: $input) {
        name
        value
      }
    }
  `;

  const variables = {
    input: {
      serviceId,
      name,
      value,
    },
  };

  return railwayGraphQL(query, variables);
}

/**
 * Main function
 */
async function tryUpdateProject(projectId) {
  try {
    console.log(`\n🔍 Trying project: ${projectId}...`);
    
    // Get services
    const services = await getServices(projectId);
    
    if (services.length === 0) {
      console.error('❌ No services found in project');
      process.exit(1);
    }

    // Use provided service ID or first service
    let service = services.find(s => s.id === RAILWAY_SERVICE_ID);
    if (!service && RAILWAY_SERVICE_ID) {
      console.error(`❌ Service ${RAILWAY_SERVICE_ID} not found`);
      process.exit(1);
    }
    if (!service) {
      service = services[0];
      console.log(`ℹ️  Using first service: ${service.name} (${service.id})`);
    } else {
      console.log(`✓ Using service: ${service.name} (${service.id})`);
    }

    // Get current variables
    console.log('\n📦 Fetching current environment variables...');
    const currentVars = await getEnvironmentVariables(service.id);
    const currentVarMap = new Map(currentVars.map(v => [v.name, v.value]));

    // Check ALLOWED_ORIGINS
    const currentOrigins = currentVarMap.get('ALLOWED_ORIGINS') || '';
    const originsList = currentOrigins 
      ? currentOrigins.split(',').map(o => o.trim())
      : [];

    console.log(`\n📝 Current ALLOWED_ORIGINS: ${currentOrigins || '(not set)'}`);

    // Check if Vercel URL is already included
    if (originsList.includes(VERCEL_URL)) {
      console.log(`✅ Vercel URL (${VERCEL_URL}) is already in ALLOWED_ORIGINS`);
      return;
    }

    // Add Vercel URL
    const updatedOrigins = [...originsList, VERCEL_URL].join(',');
    console.log(`\n🔄 Updating ALLOWED_ORIGINS to include: ${VERCEL_URL}`);
    console.log(`   New value: ${updatedOrigins}`);

    // Update the variable
    await setEnvironmentVariable(service.id, 'ALLOWED_ORIGINS', updatedOrigins);
    
    console.log('\n✅ Successfully updated ALLOWED_ORIGINS!');
    console.log(`\n📋 Updated ALLOWED_ORIGINS: ${updatedOrigins}`);
    console.log('\n⚠️  Note: Railway will automatically restart your service with the new environment variables.');
    
    return true; // Success
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🚂 Railway Environment Variable Updater\n');
    console.log(`📋 Will try ${RAILWAY_PROJECT_IDS.length} project(s):`);
    RAILWAY_PROJECT_IDS.forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });

    // Try each project until one succeeds
    let success = false;
    for (const projectId of RAILWAY_PROJECT_IDS) {
      success = await tryUpdateProject(projectId);
      if (success) {
        console.log(`\n✅ Successfully updated project: ${projectId}`);
        break;
      }
    }

    if (!success) {
      console.error('\n❌ Failed to update any project');
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure your RAILWAY_API_TOKEN is valid');
      console.error('   - Check that at least one project has services');
      console.error('   - Run: npm run railway:list to see your projects');
      process.exit(1);
    }

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

