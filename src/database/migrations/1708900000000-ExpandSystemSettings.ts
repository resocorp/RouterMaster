import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandSystemSettings1708900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // General
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hide_limits_in_user_list BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS add_new_nas_to_all_services BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS add_new_manager_to_all_services BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS disconnect_time_hour SMALLINT NOT NULL DEFAULT 23`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS disconnect_time_minute SMALLINT NOT NULL DEFAULT 59`);

    // Billing
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS adv_sales_tax DECIMAL(5,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS reset_credits_on_service_change BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS disconnect_postpaid_at_billing_start BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS disable_accounts_unpaid_invoices BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS disable_accounts_expired_contract BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS enable_voucher_redemption BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS enable_account_recharge BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS enable_deposit_purchase BOOLEAN NOT NULL DEFAULT true`);

    // Replace old gateway columns with new ones
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_paypal_standard BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_paypal_pro BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_paypal_express BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_netcash BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_payfast BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_authorize_net BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_dps_payment_express BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_2checkout BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_payu BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_paytm BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_bkash BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_easypay BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_mpesa BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_custom BOOLEAN NOT NULL DEFAULT false`);

    // Account
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS mandatory_fields JSONB DEFAULT '[]'`);

    // Self Reg & IAS
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_name_requires_sms BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_name_requires_email BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_cell_requires_sms BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_mandatory_fields JSONB DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_allow_duplicate_email BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_allow_duplicate_cell BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_default_sim_use SMALLINT NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_default_user_group VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ias_mandatory_fields JSONB DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ias_allow_duplicate_email BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ias_allow_duplicate_cell BOOLEAN NOT NULL DEFAULT false`);

    // Notifications
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notify_manager_on_reg_email BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS new_service_plan_email BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS new_service_plan_sms BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS renewal_notification_email BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS renewal_notification_sms BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS expiry_alert_email BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS expiry_alert_sms BOOLEAN NOT NULL DEFAULT true`);

    // Alert fields - replace old single-value fields with MB + percent pairs
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_dl_mb DECIMAL(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_dl_percent DECIMAL(5,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_ul_mb DECIMAL(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_ul_percent DECIMAL(5,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_total_mb DECIMAL(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_total_percent DECIMAL(5,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_online_time VARCHAR(10) NOT NULL DEFAULT '00:00:00'`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_online_time_percent DECIMAL(5,2) NOT NULL DEFAULT 0`);

    // Drop old columns that are no longer used
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_activation`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_fields`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_stripe`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_paystack`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_paypal`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS notify_manager_on_reg`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_dl`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_ul`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_total`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_time_minutes`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore old columns
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_activation VARCHAR(10) NOT NULL DEFAULT 'none'`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS self_reg_fields JSONB DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_stripe BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_paystack BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS gw_paypal BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notify_manager_on_reg BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_dl DECIMAL(10,2) NOT NULL DEFAULT 80`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_ul DECIMAL(10,2) NOT NULL DEFAULT 80`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_total DECIMAL(10,2) NOT NULL DEFAULT 80`);
    await queryRunner.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS alert_time_minutes INT NOT NULL DEFAULT 60`);

    // Drop new columns
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS hide_limits_in_user_list`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS add_new_nas_to_all_services`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS add_new_manager_to_all_services`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS disconnect_time_hour`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS disconnect_time_minute`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS adv_sales_tax`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS reset_credits_on_service_change`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS disconnect_postpaid_at_billing_start`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS disable_accounts_unpaid_invoices`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS disable_accounts_expired_contract`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS enable_voucher_redemption`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS enable_account_recharge`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS enable_deposit_purchase`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_paypal_standard`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_paypal_pro`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_paypal_express`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_netcash`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_payfast`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_authorize_net`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_dps_payment_express`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_2checkout`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_payu`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_paytm`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_bkash`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_easypay`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_mpesa`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS gw_custom`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS mandatory_fields`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_name_requires_sms`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_name_requires_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_cell_requires_sms`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_mandatory_fields`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_allow_duplicate_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_allow_duplicate_cell`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_default_sim_use`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS self_reg_default_user_group`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS ias_mandatory_fields`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS ias_allow_duplicate_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS ias_allow_duplicate_cell`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS notify_manager_on_reg_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS new_service_plan_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS new_service_plan_sms`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS renewal_notification_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS renewal_notification_sms`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS expiry_alert_email`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS expiry_alert_sms`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_dl_mb`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_dl_percent`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_ul_mb`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_ul_percent`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_total_mb`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_total_percent`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_online_time`);
    await queryRunner.query(`ALTER TABLE system_settings DROP COLUMN IF EXISTS alert_online_time_percent`);
  }
}
