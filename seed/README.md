# LMS Database Seeder

## Overview
This directory contains scripts to seed the Learning Management System (LMS) database with initial data.

## Prerequisites
- Node.js (v14+ recommended)
- MongoDB database
- Configured `.env` file with `MONGO_URI`

## Installation
1. Navigate to this directory
2. Run `npm install` to install dependencies

## Usage

### Seeding the Database
To seed the database with initial data:
```bash
npm run seed
```

### Verifying Seeded Data
To verify the seeded data:
```bash
npm run verify
```

## CSV Template
The `LMS_Seed_Template.csv` file contains the structure for seeding data. Columns are divided by data type:
- `type`: Specifies the type of data (category, user, course, module, lesson, quiz, enrollment)
- Subsequent columns are specific to each data type

## Customization
1. Edit `LMS_Seed_Template.csv` to add or modify seed data
2. Adjust `seed.js` if you need to change seeding logic

## Troubleshooting
- Ensure MongoDB connection is correct in `.env`
- Check console output for any seeding or verification errors

## Notes
- Existing data will be deleted before seeding
- Passwords are hashed before storage
- Relationships between models are maintained
