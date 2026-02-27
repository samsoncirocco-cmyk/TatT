import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import neo4j from 'neo4j-driver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Timeout helper for race conditions
const timeout = (ms: number, serviceName: string): Promise<never> => {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${serviceName} check timed out after ${ms}ms`)), ms)
  );
};

// Individual service health checks
interface HealthCheck {
  service: string;
  healthy: boolean;
  message: string;
}

async function checkFirestore(): Promise<HealthCheck> {
  try {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = getFirestore();
    const healthCheckRef = db.collection('_health_check').doc('startup');

    await Promise.race([
      healthCheckRef.set({
        timestamp: new Date().toISOString(),
        source: 'startup-probe'
      }),
      timeout(10000, 'Firestore')
    ]);

    return {
      service: 'firestore',
      healthy: true,
      message: 'Firestore connected and writable'
    };
  } catch (error) {
    return {
      service: 'firestore',
      healthy: false,
      message: `Firestore check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function checkNeo4j(): Promise<HealthCheck> {
  const NEO4J_URI = process.env.NEO4J_URI;
  const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

  if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    return {
      service: 'neo4j',
      healthy: false,
      message: 'Neo4j credentials not configured (skipped in local dev)'
    };
  }

  let driver;
  try {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 1,
        connectionAcquisitionTimeout: 10000
      }
    );

    const session = driver.session();
    try {
      await Promise.race([
        session.run('RETURN 1 AS num'),
        timeout(10000, 'Neo4j')
      ]);

      return {
        service: 'neo4j',
        healthy: true,
        message: 'Neo4j connected'
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    return {
      service: 'neo4j',
      healthy: false,
      message: `Neo4j check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  } finally {
    if (driver) {
      await driver.close();
    }
  }
}

async function checkEnvironment(): Promise<HealthCheck> {
  const required = [
    'GCP_PROJECT_ID',
    'NEO4J_URI',
    'NEO4J_USER',
    'NEO4J_PASSWORD',
    'GCS_BUCKET_NAME'
  ];

  const missing = required.filter(key => {
    const value = process.env[key] || process.env[key.replace('NEO4J_USER', 'NEO4J_USERNAME')];
    return !value;
  });

  if (missing.length > 0) {
    return {
      service: 'environment',
      healthy: false,
      message: `Missing required env vars: ${missing.join(', ')}`
    };
  }

  return {
    service: 'environment',
    healthy: true,
    message: 'All required environment variables present'
  };
}

async function checkSecretManager(): Promise<HealthCheck> {
  const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

  if (!GCP_PROJECT_ID) {
    return {
      service: 'secret-manager',
      healthy: false,
      message: 'GCP_PROJECT_ID not set (skipped in local dev)'
    };
  }

  try {
    // Basic check - if we're in Cloud Run, we should have access to Secret Manager
    // Don't actually fetch secrets here, just verify the config looks valid
    const hasSecretConfig = !!(
      process.env.REPLICATE_API_TOKEN ||
      process.env.OPENROUTER_API_KEY
    );

    return {
      service: 'secret-manager',
      healthy: true,
      message: hasSecretConfig
        ? 'Secret Manager secrets injected'
        : 'Secret Manager configured (secrets pending injection)'
    };
  } catch (error) {
    return {
      service: 'secret-manager',
      healthy: false,
      message: `Secret Manager check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Run all checks in parallel
  const [envCheck, secretCheck, firestoreCheck, neo4jCheck] = await Promise.all([
    checkEnvironment().catch(err => ({
      service: 'environment',
      healthy: false,
      message: `Check crashed: ${err.message}`
    })),
    checkSecretManager().catch(err => ({
      service: 'secret-manager',
      healthy: false,
      message: `Check crashed: ${err.message}`
    })),
    checkFirestore().catch(err => ({
      service: 'firestore',
      healthy: false,
      message: `Check crashed: ${err.message}`
    })),
    checkNeo4j().catch(err => ({
      service: 'neo4j',
      healthy: false,
      message: `Check crashed: ${err.message}`
    }))
  ]);

  const checks: HealthCheck[] = [envCheck, secretCheck, firestoreCheck, neo4jCheck];
  const allHealthy = checks.every(check => check.healthy);
  const duration = Date.now() - startTime;

  const response = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    duration_ms: duration
  };

  return NextResponse.json(
    response,
    { status: allHealthy ? 200 : 503 }
  );
}
