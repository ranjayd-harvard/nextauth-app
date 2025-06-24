# Run the database setup script
node scripts/setup-database-indexes.js

# OR manually in MongoDB shell:
#db.users.createIndex({"email": 1}, {unique: true, sparse: true, collation: {locale: "en", strength: 2}})
#db.users.createIndex({"phoneNumber": 1}, {unique: true, sparse: true})