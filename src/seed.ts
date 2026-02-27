import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'radiusnexus',
  password: process.env.DB_PASSWORD || 'radiusnexus_secret',
  database: process.env.DB_DATABASE || 'radiusnexus',
  entities: [path.join(__dirname, '**/*.entity{.ts,.js}')],
  synchronize: false,
});

async function seed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Connected. Running seed...');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const tenantId = '00000000-0000-0000-0000-000000000001';

    const existingTenant = await qr.query(`SELECT id FROM tenants WHERE id = $1`, [tenantId]);
    if (existingTenant.length > 0) {
      console.log('Seed data already exists, skipping...');
      await qr.rollbackTransaction();
      await qr.release();
      await AppDataSource.destroy();
      return;
    }

    await qr.query(`
      INSERT INTO tenants (id, slug, name, enabled, settings)
      VALUES ($1, 'default', 'Default ISP', true, '{}')
    `, [tenantId]);
    console.log('Created default tenant');

    await qr.query(`
      INSERT INTO system_settings (id, tenant_id, currency, vat_percent, disconnect_method)
      VALUES (gen_random_uuid(), $1, 'USD', 0, 'nas')
    `, [tenantId]);
    console.log('Created system settings');

    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminId = '00000000-0000-0000-0000-000000000010';
    await qr.query(`
      INSERT INTO managers (id, tenant_id, username, password_hash, is_super, enabled, first_name, last_name, email, permissions)
      VALUES ($1, $2, 'admin', $3, true, true, 'Super', 'Admin', 'admin@radiusnexus.local', '{}')
    `, [adminId, tenantId, adminPasswordHash]);
    console.log('Created super admin (admin / admin123)');

    const planId = '00000000-0000-0000-0000-000000000020';
    await qr.query(`
      INSERT INTO service_plans (id, tenant_id, name, description, enabled, available_ucp, plan_type, 
        cap_download, cap_upload, cap_total, cap_expiry, cap_time,
        rate_dl, rate_ul, priority, ip_pool,
        initial_expiry_val, expiry_unit, initial_dl_mb, initial_ul_mb, initial_total_mb,
        net_unit_price, gross_unit_price, is_monthly, auto_renew)
      VALUES ($1, $2, '10Mbps Unlimited', 'Unlimited 10Mbps plan with 30 day expiry', true, true, 'prepaid',
        false, false, false, true, false,
        10240, 5120, 8, null,
        30, 'days', 0, 0, 0,
        9.99, 9.99, true, false)
    `, [planId, tenantId]);

    const plan2Id = '00000000-0000-0000-0000-000000000021';
    await qr.query(`
      INSERT INTO service_plans (id, tenant_id, name, description, enabled, available_ucp, plan_type,
        cap_download, cap_upload, cap_total, cap_expiry, cap_time,
        rate_dl, rate_ul, priority, ip_pool,
        initial_expiry_val, expiry_unit, initial_dl_mb, initial_ul_mb, initial_total_mb,
        dl_traffic_unit_mb, ul_traffic_unit_mb, total_traffic_unit_mb,
        net_unit_price, gross_unit_price, is_monthly, auto_renew)
      VALUES ($1, $2, '5Mbps 10GB', '5Mbps plan with 10GB download cap', true, true, 'prepaid',
        true, false, false, true, false,
        5120, 2560, 8, null,
        30, 'days', 10240, 0, 0,
        10240, 0, 0,
        4.99, 4.99, true, false)
    `, [plan2Id, tenantId]);
    console.log('Created 2 sample service plans');

    const nasId = '00000000-0000-0000-0000-000000000030';
    await qr.query(`
      INSERT INTO nas_devices (id, tenant_id, name, ip_address, type, secret, description)
      VALUES ($1, $2, 'Main MikroTik', '10.0.0.1', 'mikrotik', 'testing123', 'Primary router')
    `, [nasId, tenantId]);
    console.log('Created sample NAS device');

    const subPasswordHash = await bcrypt.hash('test123', 10);
    const subId = '00000000-0000-0000-0000-000000000040';
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    await qr.query(`
      INSERT INTO subscribers (id, tenant_id, username, password_hash, password_plain, account_type, status, enabled,
        plan_id, sim_use, first_name, last_name, email,
        dl_limit_bytes, ul_limit_bytes, total_limit_bytes, time_limit_secs, expiry_date)
      VALUES ($1, $2, 'testuser', $3, 'test123', 'regular', 'active', true,
        $4, 1, 'Test', 'User', 'test@example.com',
        0, 0, 0, 0, $5)
    `, [subId, tenantId, subPasswordHash, planId, expiryDate.toISOString()]);
    console.log('Created sample subscriber (testuser / test123)');

    await qr.query(`
      INSERT INTO user_groups (id, tenant_id, name, description)
      VALUES (gen_random_uuid(), $1, 'Default', 'Default user group')
    `, [tenantId]);
    console.log('Created default user group');

    await qr.commitTransaction();
    console.log('Seed completed successfully!');
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('Seed failed:', err);
    throw err;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
