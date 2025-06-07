# Database Seeding for Development

## Overview
The database seeding system provides a comprehensive way to populate your local development SQLite database with realistic test data for the Old Man Footy platform.

## Features
- **Realistic Test Data**: Australian Rugby League club names and locations
- **MySideline Integration**: Automatically imports real events from MySideline
- **Complete User System**: Admin users, primary delegates, and secondary delegates
- **Sample Carnivals**: Manual test carnivals across all Australian states
- **Email Subscriptions**: Test email subscriptions for notification testing

## Usage

### Quick Start
```bash
# Seed the database with test data
npm run seed
```

### What Gets Created
- **12 Rugby League Clubs** across all Australian states
- **Admin User**: `admin@rugbyleaguemasters.com.au` / `admin123`
- **Primary Delegates**: One per club (`primary@[clubname].com.au` / `delegate123`)
- **Secondary Delegates**: Random additional delegates for some clubs
- **5 Manual Test Carnivals** with realistic data
- **MySideline Events**: Automatically imported from MySideline.com.au
- **5 Email Subscriptions** for testing notifications

### Login Credentials
After seeding, you can log in with:
- **Admin**: `admin@rugbyleaguemasters.com.au` / `admin123`
- **Delegates**: `primary@[clubname].com.au` / `delegate123`

Example delegate emails:
- `primary@canterburybankstonmasters.com.au`
- `primary@brisbanebroncosmasters.com.au`
- `primary@melbournestormmasters.com.au`

## Sample Data Included

### Test Clubs
- Canterbury Bankstown Masters (NSW)
- Parramatta Eels Masters (NSW)
- Brisbane Broncos Masters (QLD)
- Gold Coast Titans Masters (QLD)
- Melbourne Storm Masters (VIC)
- Geelong Masters Rugby League (VIC)
- Perth Pirates Masters (WA)
- Fremantle Dockers Masters (WA)
- Adelaide Rams Masters (SA)
- Port Adelaide Masters (SA)
- Hobart Devils Masters (TAS)
- Launceston Lions Masters (TAS)

### Sample Carnivals
- NSW Masters Grand Final (September 2025)
- Queensland Masters Carnival (August 2025)
- Victorian Masters Championship (July 2025)
- Perth Masters Festival (October 2025)
- Adelaide Masters Cup (June 2025)

## Technical Details

### Database Tables Populated
- `Users` - Admin and delegate accounts
- `Clubs` - Rugby League clubs across Australia
- `Carnivals` - Manual and MySideline imported events
- `EmailSubscriptions` - Test email subscriptions

### MySideline Integration
The seeder automatically attempts to import real events from MySideline.com.au for each Australian state. If MySideline is unavailable, it gracefully falls back to mock data.

### Data Cleanup
The seeder automatically clears all existing data before creating new test data, ensuring a clean development environment.

## Customization

You can modify the sample data in `scripts/seed-database.js`:
- `SAMPLE_CLUBS` - Add or modify test clubs
- `SAMPLE_CARNIVALS` - Add or modify test carnivals
- `SAMPLE_SUBSCRIPTIONS` - Add or modify email subscriptions

## Troubleshooting

### SQLite Database Issues
The SQLite database is automatically created when the application starts. Ensure the `data/` directory has write permissions:
```bash
# Create data directory if it doesn't exist
mkdir -p data
chmod 755 data
```

If you need to manually check the database:
```bash
# Access the SQLite database
sqlite3 data/rugby-league-masters-dev.db
.tables
.quit
```

### MySideline Import Failures
If MySideline.com.au is unavailable, the seeder will display a warning but continue with mock data. This is normal and expected during development.

### Permission Issues
Ensure the `uploads/` directory exists and has write permissions for file upload testing.