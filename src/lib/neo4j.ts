import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

export const NEO4J_QUERY_TIMEOUT = 5000;
export const NEO4J_DEFAULT_LIMIT = 50;

let driver: any;

export function getNeo4jDriver() {
    if (!driver) {
        if (NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD) {
            try {
                driver = neo4j.driver(
                    NEO4J_URI,
                    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
                    {
                        maxConnectionPoolSize: 10,
                        connectionAcquisitionTimeout: 60000,
                        maxConnectionLifetime: 3600000,
                        connectionTimeout: 30000
                    }
                );
                console.log('[Neo4j] Driver initialized');
            } catch (error) {
                console.error('[Neo4j] Driver initialization failed:', error);
            }
        } else {
            console.warn('[Neo4j] Configuration missing');
        }
    }
    return driver;
}

export async function closeNeo4jDriver() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}

export async function verifyNeo4jConnectivity(): Promise<boolean> {
    const neo4jDriver = getNeo4jDriver();
    if (!neo4jDriver) {
        return false;
    }

    try {
        await neo4jDriver.verifyConnectivity();
        return true;
    } catch (error) {
        console.error('[Neo4j] Connectivity verification failed:', error);
        return false;
    }
}
