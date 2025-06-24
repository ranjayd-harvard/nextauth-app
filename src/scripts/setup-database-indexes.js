// Complete database setup script to ensure unique constraints
// File: /scripts/setup-database-indexes.js
// Run this with: node scripts/setup-database-indexes.js
// Complete fix for setup-database-indexes.js
// This replaces all the problematic index sections

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function setupDatabaseIndexes() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable not found')
    console.log('Please add MONGODB_URI to your .env.local file')
    process.exit(1)
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    console.log('🔗 Connecting to MongoDB...')
    await client.connect()
    console.log('✅ Connected to MongoDB successfully')
    
    const db = client.db()
    const users = db.collection('users')
    const tokens = db.collection('verification_tokens')
    
    console.log('\n📋 Setting up database indexes...\n')

    // 1. Create unique index for email (case-insensitive)
    console.log('📧 Creating unique email index...')
    try {
      await users.createIndex(
        { "email": 1 }, 
        { 
          unique: true, 
          sparse: true,
          collation: { locale: "en", strength: 2 },
          name: "unique_email_idx"
        }
      )
      console.log('✅ Email unique index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Email index already exists')
      } else {
        console.error('❌ Failed to create email index:', error.message)
      }
    }

    // 2. Create unique index for phoneNumber
    console.log('📱 Creating unique phone number index...')
    try {
      await users.createIndex(
        { "phoneNumber": 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: "unique_phone_idx"
        }
      )
      console.log('✅ Phone number unique index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Phone number index already exists')
      } else {
        console.error('❌ Failed to create phone number index:', error.message)
      }
    }

    // 3. Create compound index for performance (no arrays)
    console.log('🔍 Creating compound index for performance...')
    try {
      await users.createIndex(
        { 
          "email": 1, 
          "phoneNumber": 1,
          "accountStatus": 1
        }, 
        { 
          sparse: true,
          name: "compound_search_idx"
        }
      )
      console.log('✅ Compound index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Compound index already exists')
      } else {
        console.error('❌ Failed to create compound index:', error.message)
      }
    }

    // 4. Create separate indexes for array fields (NO COMPOUND WITH ARRAYS)
    console.log('📧 Creating linkedEmails index...')
    try {
      await users.createIndex(
        { "linkedEmails": 1 }, 
        { 
          name: "linked_emails_idx"
        }
      )
      console.log('✅ LinkedEmails index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ LinkedEmails index already exists')
      } else {
        console.error('❌ Failed to create linkedEmails index:', error.message)
      }
    }

    // 5. Create separate index for linkedPhones
    console.log('📱 Creating linkedPhones index...')
    try {
      await users.createIndex(
        { "linkedPhones": 1 }, 
        { 
          name: "linked_phones_idx"
        }
      )
      console.log('✅ LinkedPhones index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ LinkedPhones index already exists')
      } else {
        console.error('❌ Failed to create linkedPhones index:', error.message)
      }
    }

    // 6. Create text search index for names (separate from arrays)
    console.log('🔍 Creating name text search index...')
    try {
      await users.createIndex(
        { "name": "text" }, 
        { 
          name: "name_text_search_idx"
        }
      )
      console.log('✅ Name text search index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Name text search index already exists')
      } else {
        console.error('❌ Failed to create name text search index:', error.message)
      }
    }

    // 7. Create account status index
    console.log('📊 Creating account status index...')
    try {
      await users.createIndex(
        { "accountStatus": 1 }, 
        { 
          name: "account_status_idx"
        }
      )
      console.log('✅ Account status index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Account status index already exists')
      } else {
        console.error('❌ Failed to create account status index:', error.message)
      }
    }

    // 8. Create group queries index
    console.log('👥 Creating group index...')
    try {
      await users.createIndex(
        { 
          "groupId": 1,
          "accountStatus": 1,
          "isMaster": 1
        }, 
        { 
          name: "group_queries_idx"
        }
      )
      console.log('✅ Group index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Group index already exists')
      } else {
        console.error('❌ Failed to create group index:', error.message)
      }
    }

    // 9. Setup verification tokens collection indexes
    console.log('\n🎫 Setting up verification tokens indexes...')
    
    // TTL index for token expiration
    try {
      await tokens.createIndex(
        { "expires": 1 },
        { 
          expireAfterSeconds: 0,
          name: "token_expiry_idx"
        }
      )
      console.log('✅ Token expiry index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Token expiry index already exists')
      } else {
        console.error('❌ Failed to create token expiry index:', error.message)
      }
    }

    // Unique token index
    try {
      await tokens.createIndex(
        { 
          "token": 1,
          "type": 1
        },
        { 
          unique: true,
          name: "unique_token_idx"
        }
      )
      console.log('✅ Unique token index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Unique token index already exists')
      } else {
        console.error('❌ Failed to create unique token index:', error.message)
      }
    }

    // Token lookup index (no arrays)
    try {
      await tokens.createIndex(
        { 
          "email": 1,
          "phoneNumber": 1,
          "type": 1,
          "used": 1
        },
        { 
          name: "token_lookup_idx"
        }
      )
      console.log('✅ Token lookup index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Token lookup index already exists')
      } else {
        console.error('❌ Failed to create token lookup index:', error.message)
      }
    }

    // 10. Show current index status
    console.log('\n📊 Current indexes on users collection:')
    const userIndexes = await users.indexes()
    userIndexes.forEach(index => {
      const keyStr = JSON.stringify(index.key)
      const unique = index.unique ? ' (UNIQUE)' : ''
      const sparse = index.sparse ? ' (SPARSE)' : ''
      const text = index.textIndexVersion ? ' (TEXT)' : ''
      console.log(`  - ${index.name}: ${keyStr}${unique}${sparse}${text}`)
    })

    console.log('\n📊 Current indexes on verification_tokens collection:')
    const tokenIndexes = await tokens.indexes()
    tokenIndexes.forEach(index => {
      const keyStr = JSON.stringify(index.key)
      const unique = index.unique ? ' (UNIQUE)' : ''
      const ttl = index.expireAfterSeconds !== undefined ? ' (TTL)' : ''
      console.log(`  - ${index.name}: ${keyStr}${unique}${ttl}`)
    })

    console.log('\n🎉 Database setup completed successfully!')
    console.log('\n📝 Key changes made:')
    console.log('  ✅ Separated array field indexes (linkedEmails, linkedPhones)')
    console.log('  ✅ Removed parallel array compound indexes')
    console.log('  ✅ Created individual indexes for each array field')
    console.log('  ✅ Kept non-array compound indexes for performance')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

setupDatabaseIndexes()