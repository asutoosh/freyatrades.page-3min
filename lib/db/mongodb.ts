/**
 * MongoDB/Azure Cosmos DB Connection
 * 
 * Azure Cosmos DB with MongoDB API provides:
 * - JSON-native document storage
 * - Serverless pricing option
 * - Global distribution
 * - 99.99% SLA
 */

import { MongoClient, Db, Collection, Document } from 'mongodb'

// Connection string from Azure Cosmos DB
// Support both naming conventions (with and without underscore)
const MONGODB_URI = process.env.AZURE_COSMOS_CONNECTION_STRING || 
                     process.env.AZURE_COSMOS_CONNECTIONSTRING || 
                     process.env.MONGODB_URI || 
                     ''
const DB_NAME = process.env.AZURE_COSMOS_DB_NAME || 'freyatrades'

// Validate configuration
if (!MONGODB_URI) {
  if (process.env.NODE_ENV === 'production') {
    // CRITICAL: Production requires a database - fail fast
    throw new Error(
      'FATAL: Database connection string required in production. ' +
      'Set AZURE_COSMOS_CONNECTION_STRING or MONGODB_URI environment variable.'
    )
  } else {
    console.warn('⚠️ Database not configured - using in-memory fallback (DEVELOPMENT ONLY)')
  }
} else {
  console.log('✅ Database connection string found')
}

// Global client promise for connection reuse
let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

/**
 * Get MongoDB client (connection pooling)
 */
async function getClient(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    throw new Error('MongoDB connection string not configured')
  }

  if (client) {
    return client
  }

  if (!clientPromise) {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      // Azure Cosmos DB specific options
      retryWrites: false, // Cosmos DB doesn't support retryWrites
      w: 'majority' as const,
    }

    clientPromise = MongoClient.connect(MONGODB_URI, options)
      .then((connectedClient) => {
        client = connectedClient
        console.log('✅ Connected to Azure Cosmos DB')
        return connectedClient
      })
      .catch((err) => {
        console.error('❌ Failed to connect to Azure Cosmos DB:', err)
        clientPromise = null
        throw err
      })
  }

  return clientPromise
}

/**
 * Get database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await getClient()
  return client.db(DB_NAME)
}

/**
 * Get a collection
 */
export async function getCollection<T extends Document = Document>(
  collectionName: string
): Promise<Collection<T>> {
  const db = await getDatabase()
  return db.collection<T>(collectionName)
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!MONGODB_URI
}

/**
 * Close connection (for graceful shutdown)
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    clientPromise = null
    console.log('👋 Closed Azure Cosmos DB connection')
  }
}

// Collection names
export const COLLECTIONS = {
  IP_ACCESS: 'ip_access',
  SIGNALS: 'signals',
} as const

