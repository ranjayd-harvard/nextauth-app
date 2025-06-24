// scripts/drop-problematic-indexes.js
// Run this first to clean up the bad indexes

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function dropProblematicIndexes() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable not found')
    process.exit(1)
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const users = db.collection('users')
    
    console.log('\n🧹 Dropping problematic indexes...')
    
    // List of indexes that have parallel array issues
    const problematicIndexes = [
      'account_linking_idx',
      'auth_lookup_idx'
    ]
    
    for (const indexName of problematicIndexes) {
      try {
        await users.dropIndex(indexName)
        console.log(`✅ Dropped index: ${indexName}`)
      } catch (error) {
        if (error.code === 27) {
          console.log(`ℹ️ Index ${indexName} doesn't exist (already dropped)`)
        } else {
          console.log(`⚠️ Error dropping ${indexName}: ${error.message}`)
        }
      }
    }
    
    console.log('\n📊 Remaining indexes:')
    const indexes = await users.indexes()
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log('\n✅ Cleanup completed! Now run: node scripts/setup-database-indexes.js')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

dropProblematicIndexes()