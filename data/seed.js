/**
 * Seed Script — populates MongoDB with demo data for presentation
 *
 * Credentials seeded:
 *   Police   → police1 / 12345678   (assigned to half the junctions)
 *              police2 / 87654321   (assigned to other half)
 *   Ambulance→ ambulance12 / 12341234
 *
 * Police junction allocation is INTERNAL ONLY — not shown on any dashboard UI.
 *
 * Run: node data/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ExcelJS  = require('exceljs');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const Hospital  = require('../models/Hospital');
const Junction  = require('../models/Junction');
const Police    = require('../models/Police');
const Ambulance = require('../models/Ambulance');

const DATA_DIR = __dirname;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const readExcel = async (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  const rows = [];
  let headers = [];

  worksheet.eachRow((row, rowIndex) => {
    const values = row.values.slice(1);
    if (rowIndex === 1) {
      headers = values.map((h) => String(h).trim());
    } else {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = values[i] !== undefined ? values[i] : null; });
      rows.push(obj);
    }
  });

  return rows;
};

const yesNo = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string')  return val.toLowerCase() === 'yes';
  return false;
};

// ─── Seed Hospitals ───────────────────────────────────────────────────────────
const seedHospitals = async () => {
  const rows = await readExcel('hospitals_dataset_filled.xlsx');
  await Hospital.deleteMany({});

  const hospitals = rows.map((r) => ({
    hospitalId:            r.hospitalId,
    hospitalName:          r.hospitalName,
    address:               r.address,
    latitude:              parseFloat(r.latitude),
    longitude:             parseFloat(r.longitude),
    distanceFromVignan_km: parseFloat(r.distanceFromVignan_km) || null,
    googleETA_min:         parseFloat(r.googleETA_min) || null,
    emergencyAvailable:    yesNo(r.emergencyAvailable),
    specialties: {
      cardiology:   yesNo(r.cardiology),
      neurology:    yesNo(r.neurology),
      trauma:       yesNo(r.trauma),
      orthopedics:  yesNo(r.orthopedics),
      nephrology:   yesNo(r.nephrology),
      pulmonology:  yesNo(r.pulmonology),
      criticalCare: yesNo(r.criticalCare),
    },
    notes: r.notes || '',
  }));

  await Hospital.insertMany(hospitals);
  console.log(`✅ Hospitals seeded: ${hospitals.length} records`);
};

// ─── Seed Junctions & assign to police officers ───────────────────────────────
// police1 → first half of junctions | police2 → second half
// assignedPoliceId is stored in DB but NOT exposed via the police dashboard UI.

const seedJunctions = async () => {
  const rows = await readExcel('guntur_junction_dataset.xlsx');
  await Junction.deleteMany({});

  const junctions = rows.map((r, index) => {
    // Alternate assignment: even index → PI-GNT-01 (police1), odd → PI-GNT-02 (police2)
    const assignedPoliceId = index % 2 === 0 ? 'PI-GNT-01' : 'PI-GNT-02';

    return {
      junctionId:       r.junctionId || `JN-${String(index + 1).padStart(3, '0')}`,
      junctionName:     r.junctionName,
      latitude:         parseFloat(r.latitude),
      longitude:        parseFloat(r.longitude),
      junctionType:     r.junctionType || 'Intersection',
      isMajorJunction:  yesNo(r.isMajorJunction),
      congestionWeight: parseInt(r.congestionWeight) || 1,
      assignedPoliceId, // internal only — not shown in dashboard
      remarks:          r.remarks || '',
    };
  });

  await Junction.insertMany(junctions);
  console.log(`✅ Junctions seeded: ${junctions.length} records`);
  console.log(`   • PI-GNT-01 (police1) → ${junctions.filter(j => j.assignedPoliceId === 'PI-GNT-01').length} junctions`);
  console.log(`   • PI-GNT-02 (police2) → ${junctions.filter(j => j.assignedPoliceId === 'PI-GNT-02').length} junctions`);
};

// ─── Seed Police Officers ─────────────────────────────────────────────────────
const seedPolice = async () => {
  await Police.deleteMany({});

  const salt = await bcrypt.genSalt(10);

  const policeOfficers = [
    {
      policeId:           'PI-GNT-01',
      officerName:        'Inspector Ravi Kumar',
      badgeNumber:        'GNT-101',
      username:           'police1',
      password:           await bcrypt.hash('12345678', salt),
      assignedJunctionId: 'JN-001',  // first junction (internal, not shown on UI)
      phone:              '+91-9876543201',
      isOnDuty:           true,
      role:               'police',
    },
    {
      policeId:           'PI-GNT-02',
      officerName:        'Inspector Priya Sharma',
      badgeNumber:        'GNT-102',
      username:           'police2',
      password:           await bcrypt.hash('87654321', salt),
      assignedJunctionId: 'JN-002',  // second junction (internal, not shown on UI)
      phone:              '+91-9876543202',
      isOnDuty:           true,
      role:               'police',
    },
  ];

  await Police.collection.insertMany(policeOfficers);
  console.log(`✅ Police officers seeded: ${policeOfficers.length} officers`);
  console.log('   • police1 / 12345678  → Inspector Ravi Kumar   (PI-GNT-01)');
  console.log('   • police2 / 87654321  → Inspector Priya Sharma  (PI-GNT-02)');
};

// ─── Seed Ambulance Driver ────────────────────────────────────────────────────
const seedAmbulances = async () => {
  await Ambulance.deleteMany({});

  const salt = await bcrypt.genSalt(10);

  const drivers = [
    {
      ambulanceId: 'AMB-001',
      driverName: 'Venkat Suresh',
      username: 'ambulance12',
      password: await bcrypt.hash('12341234', salt),
      vehicleNumber: 'AP-29-AB-0012',
      phone: '+91-9988001122',
      isActive: true,
      role: 'ambulance',
    },
  ];

  await Ambulance.collection.insertMany(drivers);

  console.log(`✅ Ambulance drivers seeded: ${drivers.length}`);
  console.log('   • ambulance12 / 12341234 → Venkat Suresh (AMB-001)');
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    console.log('\n🌱 Starting database seed for demo...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    await seedHospitals();
    await seedJunctions();
    await seedPolice();
    await seedAmbulances();

    console.log('\n✅ All collections seeded successfully!\n');
    console.log('══════════════════════════════════════════');
    console.log('  DEMO LOGIN CREDENTIALS');
    console.log('══════════════════════════════════════════');
    console.log('  🚑 Ambulance Driver:');
    console.log('     username : ambulance12');
    console.log('     password : 12341234');
    console.log('');
    console.log('  👮 Police Officer 1:');
    console.log('     username : police1');
    console.log('     password : 12345678');
    console.log('');
    console.log('  👮 Police Officer 2:');
    console.log('     username : police2');
    console.log('     password : 87654321');
    console.log('══════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();