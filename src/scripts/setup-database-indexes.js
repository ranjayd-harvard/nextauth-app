// Complete database setup script to ensure unique constraints
// File: /scripts/setup-database-indexes.js
// Run this with: node scripts/setup-database-indexes.js
// # Set up indexes (default)
// node scripts/setup-database-indexes.js
// node scripts/setup-database-indexes.js setup

// # Check for duplicates (safe)
// node scripts/setup-database-indexes.js cleanup-dry-run

// # Remove duplicates (destructive - be careful!)
// node scripts/setup-database-indexes.js cleanup

// # Show help
// node scripts/setup-database-indexes.js help

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
          sparse: true,  // Allows null values but ensures uniqueness for non-null
          collation: { locale: "en", strength: 2 },  // Case-insensitive
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
          sparse: true,  // Allows null values but ensures uniqueness for non-null
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

    // 3. Create compound index for performance
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

    // 4. Create index for account linking queries
    console.log('🔗 Creating account linking index...')
    try {
      await users.createIndex(
        { 
          "name": "text",
          "linkedEmails": 1,
          "linkedPhones": 1,
          "accountStatus": 1
        }, 
        { 
          name: "account_linking_idx"
        }
      )
      console.log('✅ Account linking index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Account linking index already exists')
      } else {
        console.error('❌ Failed to create account linking index:', error.message)
      }
    }

    // 5. Create index for group queries
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

    // 6. Create index for user authentication
    console.log('🔐 Creating authentication index...')
    try {
      await users.createIndex(
        { 
          "email": 1,
          "phoneNumber": 1,
          "linkedEmails": 1,
          "linkedPhones": 1
        }, 
        { 
          name: "auth_lookup_idx"
        }
      )
      console.log('✅ Authentication index created successfully')
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Authentication index already exists')
      } else {
        console.error('❌ Failed to create authentication index:', error.message)
      }
    }

    // 7. Setup verification tokens collection indexes
    console.log('🎫 Setting up verification tokens indexes...')
    
    // TTL index for token expiration
    try {
      await tokens.createIndex(
        { "expires": 1 },
        { 
          expireAfterSeconds: 0,  // TTL index - documents expire at the "expires" time
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

    // Token lookup index
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

    console.log('\n🧹 Checking for existing duplicates...')
    
    // 8. Find duplicate emails
    const emailDuplicates = await users.aggregate([
      { $match: { email: { $exists: true, $ne: null } } },
      { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray()
    
    if (emailDuplicates.length > 0) {
      console.log(`⚠️ Found ${emailDuplicates.length} sets of duplicate emails:`)
      for (const duplicate of emailDuplicates) {
        console.log(`  - Email: ${duplicate._id} (${duplicate.count} duplicates)`)
        const userIds = duplicate.docs.map(doc => doc._id.toString()).join(', ')
        console.log(`    User IDs: ${userIds}`)
      }
      console.log('\n🔧 You may need to manually resolve these duplicates before the unique constraint takes full effect.')
    } else {
      console.log('✅ No duplicate emails found')
    }

    // 9. Find duplicate phone numbers
    const phoneDuplicates = await users.aggregate([
      { $match: { phoneNumber: { $exists: true, $ne: null } } },
      { $group: { _id: "$phoneNumber", count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray()
    
    if (phoneDuplicates.length > 0) {
      console.log(`⚠️ Found ${phoneDuplicates.length} sets of duplicate phone numbers:`)
      for (const duplicate of phoneDuplicates) {
        console.log(`  - Phone: ${duplicate._id} (${duplicate.count} duplicates)`)
        const userIds = duplicate.docs.map(doc => doc._id.toString()).join(', ')
        console.log(`    User IDs: ${userIds}`)
      }
      console.log('\n🔧 You may need to manually resolve these duplicates before the unique constraint takes full effect.')
    } else {
      console.log('✅ No duplicate phone numbers found')
    }

    // 10. Show current index status
    console.log('\n📊 Current indexes on users collection:')
    const userIndexes = await users.indexes()
    userIndexes.forEach(index => {
      const keyStr = JSON.stringify(index.key)
      const unique = index.unique ? ' (UNIQUE)' : ''
      const sparse = index.sparse ? ' (SPARSE)' : ''
      console.log(`  - ${index.name}: ${keyStr}${unique}${sparse}`)
    })

    console.log('\n📊 Current indexes on verification_tokens collection:')
    const tokenIndexes = await tokens.indexes()
    tokenIndexes.forEach(index => {
      const keyStr = JSON.stringify(index.key)
      const unique = index.unique ? ' (UNIQUE)' : ''
      const ttl = index.expireAfterSeconds !== undefined ? ' (TTL)' : ''
      console.log(`  - ${index.name}: ${keyStr}${unique}${ttl}`)
    })

    // 11. Database statistics
    console.log('\n📈 Database statistics:')
    const userCount = await users.countDocuments()
    const tokenCount = await tokens.countDocuments()
    console.log(`  - Total users: ${userCount}`)
    console.log(`  - Total verification tokens: ${tokenCount}`)
    
    const verifiedEmailCount = await users.countDocuments({ emailVerified: true })
    const verifiedPhoneCount = await users.countDocuments({ phoneVerified: true })
    console.log(`  - Users with verified emails: ${verifiedEmailCount}`)
    console.log(`  - Users with verified phones: ${verifiedPhoneCount}`)

    console.log('\n🎉 Database setup completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('  1. Update your registration endpoints with the new validation code')
    console.log('  2. Test duplicate registration prevention')
    console.log('  3. Resolve any existing duplicates shown above')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

// Optional: Function to clean up duplicate records
async function cleanupDuplicates(dryRun = true) {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable not found')
    process.exit(1)
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db()
    const users = db.collection('users')
    
    console.log(dryRun ? '🔍 DRY RUN - Finding duplicates (no changes will be made)' : '🧹 CLEANUP - Removing duplicates')
    
    // Find and handle email duplicates
    const emailDuplicates = await users.aggregate([
      { $match: { email: { $exists: true, $ne: null } } },
      { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray()
    
    for (const duplicate of emailDuplicates) {
      const docs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      const keepUser = docs[0] // Keep the oldest
      const removeUsers = docs.slice(1) // Remove the rest
      
      console.log(`📧 Email ${duplicate._id}: Keeping ${keepUser._id}, removing ${removeUsers.length} duplicates`)
      
      if (!dryRun) {
        for (const user of removeUsers) {
          await users.deleteOne({ _id: user._id })
          console.log(`  Removed user: ${user._id}`)
        }
      }
    }
    
    // Find and handle phone duplicates
    const phoneDuplicates = await users.aggregate([
      { $match: { phoneNumber: { $exists: true, $ne: null } } },
      { $group: { _id: "$phoneNumber", count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray()
    
    for (const duplicate of phoneDuplicates) {
      const docs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      const keepUser = docs[0] // Keep the oldest
      const removeUsers = docs.slice(1) // Remove the rest
      
      console.log(`📱 Phone ${duplicate._id}: Keeping ${keepUser._id}, removing ${removeUsers.length} duplicates`)
      
      if (!dryRun) {
        for (const user of removeUsers) {
          await users.deleteOne({ _id: user._id })
          console.log(`  Removed user: ${user._id}`)
        }
      }
    }
    
  } finally {
    await client.close()
  }
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'setup':
    setupDatabaseIndexes()
    break
  case 'cleanup':
    cleanupDuplicates(false)
    break
  case 'cleanup-dry-run':
    cleanupDuplicates(true)
    break
  case 'help':
    console.log(`
📖 Database Setup Script Usage:

node scripts/setup-database-indexes.js [command]

Commands:
  setup           - Set up database indexes (default)
  cleanup-dry-run - Check for duplicates without removing them
  cleanup         - Remove duplicate records (DESTRUCTIVE)
  help           - Show this help message

Examples:
  node scripts/setup-database-indexes.js
  node scripts/setup-database-indexes.js setup
  node scripts/setup-database-indexes.js cleanup-dry-run
    `)
    break
  default:
    setupDatabaseIndexes()
}

// Export functions for use in other scripts
export { setupDatabaseIndexes, cleanupDuplicates }