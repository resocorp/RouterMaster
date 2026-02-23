-- RadiusNexus Database Initialization
-- This file creates all enums, tables, indexes, and constraints

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE account_type AS ENUM ('regular','mac','docsis','mikrotik_acl','staros_acl','card','ias');
CREATE TYPE account_status AS ENUM ('active','disabled','expired');
CREATE TYPE plan_type AS ENUM ('prepaid','prepaid_card','postpaid','email','acl');
CREATE TYPE nas_type AS ENUM ('mikrotik','cisco','chillispot','staros','pfsense','other');
CREATE TYPE dynamic_rate_method AS ENUM ('disabled','api','coa');
CREATE TYPE ip_mode AS ENUM ('pool','dhcp','static');
CREATE TYPE pool_type AS ENUM ('radius','docsis');
CREATE TYPE card_type AS ENUM ('classic','refill');
CREATE TYPE card_status AS ENUM ('active','used','expired','revoked');
CREATE TYPE expiry_mode AS ENUM ('fixed','from_activation');
CREATE TYPE invoice_type AS ENUM ('cash','transfer','online','internal','card');
CREATE TYPE date_add_mode AS ENUM ('reset','prolong','prolong_corrected');
CREATE TYPE time_add_mode AS ENUM ('reset','prolong');
CREATE TYPE traffic_add_mode AS ENUM ('reset','additive');
CREATE TYPE service_change_status AS ENUM ('scheduled','completed','cancelled');

-- ============================================================
-- TABLES
-- ============================================================

-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(63) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Settings (one per tenant)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    disconnect_method VARCHAR(20) NOT NULL DEFAULT 'nas',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    vat_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    postpaid_renewal_day SMALLINT NOT NULL DEFAULT 1,
    billing_period_start SMALLINT NOT NULL DEFAULT 1,
    grace_period_days SMALLINT NOT NULL DEFAULT 0,
    self_reg_enabled BOOLEAN NOT NULL DEFAULT false,
    self_reg_activation VARCHAR(10) NOT NULL DEFAULT 'none',
    self_reg_fields JSONB DEFAULT '[]',
    captcha_enabled BOOLEAN NOT NULL DEFAULT false,
    ucp_edit_data BOOLEAN NOT NULL DEFAULT true,
    ucp_service_change VARCHAR(20) NOT NULL DEFAULT 'never',
    ucp_change_password BOOLEAN NOT NULL DEFAULT true,
    ucp_redeem_voucher BOOLEAN NOT NULL DEFAULT true,
    ucp_view_invoices BOOLEAN NOT NULL DEFAULT true,
    ucp_recharge BOOLEAN NOT NULL DEFAULT false,
    lock_first_mac BOOLEAN NOT NULL DEFAULT false,
    ias_sms_verification BOOLEAN NOT NULL DEFAULT false,
    alert_level_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    alert_dl DECIMAL(10,2) NOT NULL DEFAULT 80,
    alert_ul DECIMAL(10,2) NOT NULL DEFAULT 80,
    alert_total DECIMAL(10,2) NOT NULL DEFAULT 80,
    alert_time_minutes INT NOT NULL DEFAULT 60,
    alert_expiry_days INT NOT NULL DEFAULT 3,
    alert_send_once BOOLEAN NOT NULL DEFAULT true,
    gw_internal BOOLEAN NOT NULL DEFAULT true,
    gw_stripe BOOLEAN NOT NULL DEFAULT false,
    gw_paystack BOOLEAN NOT NULL DEFAULT false,
    gw_flutterwave BOOLEAN NOT NULL DEFAULT false,
    gw_paypal BOOLEAN NOT NULL DEFAULT false,
    notify_manager_on_reg BOOLEAN NOT NULL DEFAULT false,
    welcome_email BOOLEAN NOT NULL DEFAULT false,
    welcome_sms BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Managers
CREATE TABLE managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username CITEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_super BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    address VARCHAR(500),
    city VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    vat_id VARCHAR(50),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    comment TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, username)
);

-- User Groups
CREATE TABLE user_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- IP Pools
CREATE TABLE ip_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type pool_type NOT NULL DEFAULT 'radius',
    first_ip INET NOT NULL,
    last_ip INET NOT NULL,
    next_pool_id UUID REFERENCES ip_pools(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Service Plans
CREATE TABLE service_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    available_ucp BOOLEAN NOT NULL DEFAULT true,
    plan_type plan_type NOT NULL DEFAULT 'prepaid',
    cap_download BOOLEAN NOT NULL DEFAULT false,
    cap_upload BOOLEAN NOT NULL DEFAULT false,
    cap_total BOOLEAN NOT NULL DEFAULT false,
    cap_expiry BOOLEAN NOT NULL DEFAULT true,
    cap_time BOOLEAN NOT NULL DEFAULT false,
    rate_dl INT NOT NULL DEFAULT 0,
    rate_ul INT NOT NULL DEFAULT 0,
    cisco_policy_dl VARCHAR(100),
    cisco_policy_ul VARCHAR(100),
    burst_enabled BOOLEAN NOT NULL DEFAULT false,
    burst_limit_dl INT NOT NULL DEFAULT 0,
    burst_limit_ul INT NOT NULL DEFAULT 0,
    burst_thresh_dl INT NOT NULL DEFAULT 0,
    burst_thresh_ul INT NOT NULL DEFAULT 0,
    burst_time_dl INT NOT NULL DEFAULT 0,
    burst_time_ul INT NOT NULL DEFAULT 0,
    priority INT NOT NULL DEFAULT 8,
    daily_dl_mb BIGINT NOT NULL DEFAULT 0,
    daily_ul_mb BIGINT NOT NULL DEFAULT 0,
    daily_total_mb BIGINT NOT NULL DEFAULT 0,
    daily_time_secs INT NOT NULL DEFAULT 0,
    ip_pool VARCHAR(100),
    next_disabled_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    next_expired_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    next_daily_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    ignore_static_ip BOOLEAN NOT NULL DEFAULT false,
    custom_attrs JSONB DEFAULT '[]',
    generate_tftp BOOLEAN NOT NULL DEFAULT false,
    advanced_cm TEXT,
    allowed_nas_ids UUID[] DEFAULT '{}',
    allowed_manager_ids UUID[] DEFAULT '{}',
    postpaid_calc_dl BOOLEAN NOT NULL DEFAULT false,
    postpaid_calc_ul BOOLEAN NOT NULL DEFAULT false,
    postpaid_calc_time BOOLEAN NOT NULL DEFAULT false,
    is_monthly BOOLEAN NOT NULL DEFAULT true,
    auto_renew BOOLEAN NOT NULL DEFAULT false,
    carry_over BOOLEAN NOT NULL DEFAULT false,
    reset_on_expiry BOOLEAN NOT NULL DEFAULT true,
    reset_on_negative BOOLEAN NOT NULL DEFAULT false,
    additional_credits BOOLEAN NOT NULL DEFAULT false,
    net_unit_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    gross_unit_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    net_add_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    gross_add_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    date_add_mode date_add_mode NOT NULL DEFAULT 'reset',
    time_add_mode time_add_mode NOT NULL DEFAULT 'reset',
    traffic_add_mode traffic_add_mode NOT NULL DEFAULT 'reset',
    expiry_unit VARCHAR(10) NOT NULL DEFAULT 'months',
    time_unit VARCHAR(10) NOT NULL DEFAULT 'minutes',
    dl_traffic_unit_mb BIGINT NOT NULL DEFAULT 0,
    ul_traffic_unit_mb BIGINT NOT NULL DEFAULT 0,
    total_traffic_unit_mb BIGINT NOT NULL DEFAULT 0,
    min_base_amount DECIMAL(10,4) NOT NULL DEFAULT 1,
    min_add_amount DECIMAL(10,4) NOT NULL DEFAULT 1,
    add_traffic_unit_mb BIGINT NOT NULL DEFAULT 0,
    initial_expiry_val INT NOT NULL DEFAULT 30,
    initial_time_secs INT NOT NULL DEFAULT 0,
    initial_dl_mb BIGINT NOT NULL DEFAULT 0,
    initial_ul_mb BIGINT NOT NULL DEFAULT 0,
    initial_total_mb BIGINT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Special Accounting
CREATE TABLE special_accounting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    ratio_dl DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    ratio_ul DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    ratio_time DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    days_of_week SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
    auth_allowed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dynamic Rates
CREATE TABLE dynamic_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    rate_dl INT NOT NULL DEFAULT 0,
    rate_ul INT NOT NULL DEFAULT 0,
    burst_limit_dl INT NOT NULL DEFAULT 0,
    burst_limit_ul INT NOT NULL DEFAULT 0,
    burst_thresh_dl INT NOT NULL DEFAULT 0,
    burst_thresh_ul INT NOT NULL DEFAULT 0,
    burst_time_dl INT NOT NULL DEFAULT 0,
    burst_time_ul INT NOT NULL DEFAULT 0,
    days_of_week SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NAS Devices
CREATE TABLE nas_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    type nas_type NOT NULL DEFAULT 'mikrotik',
    secret VARCHAR(255) NOT NULL,
    nas_password VARCHAR(255),
    dynamic_rate dynamic_rate_method NOT NULL DEFAULT 'disabled',
    api_username VARCHAR(100),
    api_password VARCHAR(255),
    cisco_bw VARCHAR(20) NOT NULL DEFAULT 'none',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, ip_address)
);

-- Subscribers
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username CITEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL DEFAULT 'regular',
    status account_status NOT NULL DEFAULT 'active',
    enabled BOOLEAN NOT NULL DEFAULT true,
    verified BOOLEAN NOT NULL DEFAULT false,
    mac_cpe VARCHAR(17),
    mac_cm VARCHAR(17),
    mac_lock BOOLEAN NOT NULL DEFAULT false,
    ip_mode_cpe ip_mode NOT NULL DEFAULT 'pool',
    ip_mode_cm ip_mode NOT NULL DEFAULT 'pool',
    static_ip_cpe INET,
    static_ip_cm INET,
    sim_use INT NOT NULL DEFAULT 1,
    plan_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    group_id UUID REFERENCES user_groups(id) ON DELETE SET NULL,
    dl_limit_bytes BIGINT NOT NULL DEFAULT 0,
    ul_limit_bytes BIGINT NOT NULL DEFAULT 0,
    total_limit_bytes BIGINT NOT NULL DEFAULT 0,
    time_limit_secs INT NOT NULL DEFAULT 0,
    expiry_date TIMESTAMPTZ,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    daily_dl_used BIGINT NOT NULL DEFAULT 0,
    daily_ul_used BIGINT NOT NULL DEFAULT 0,
    daily_total_used BIGINT NOT NULL DEFAULT 0,
    daily_time_used INT NOT NULL DEFAULT 0,
    daily_reset_at DATE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    address VARCHAR(500),
    city VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    vat_id VARCHAR(50),
    contract_id VARCHAR(100),
    contract_expiry DATE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    comment TEXT,
    email_alerts BOOLEAN NOT NULL DEFAULT true,
    sms_alerts BOOLEAN NOT NULL DEFAULT false,
    alert_sent BOOLEAN NOT NULL DEFAULT false,
    pin_failures SMALLINT NOT NULL DEFAULT 0,
    verify_failures SMALLINT NOT NULL DEFAULT 0,
    sms_sent_count INT NOT NULL DEFAULT 0,
    custom_attrs JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, username)
);

CREATE INDEX idx_subscribers_plan ON subscribers(plan_id);
CREATE INDEX idx_subscribers_manager ON subscribers(manager_id);
CREATE INDEX idx_subscribers_status ON subscribers(tenant_id, status, enabled);
CREATE INDEX idx_subscribers_mac_cpe ON subscribers(mac_cpe) WHERE mac_cpe IS NOT NULL;
CREATE INDEX idx_subscribers_mac_cm ON subscribers(mac_cm) WHERE mac_cm IS NOT NULL;
CREATE INDEX idx_subscribers_email ON subscribers(email) WHERE email IS NOT NULL;

-- Radacct (RADIUS Accounting)
CREATE TABLE radacct (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    unique_id VARCHAR(64),
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
    username CITEXT NOT NULL,
    nas_id UUID REFERENCES nas_devices(id) ON DELETE SET NULL,
    nas_ip INET,
    nas_port_id VARCHAR(50),
    framed_ip INET,
    calling_station VARCHAR(50),
    called_station VARCHAR(50),
    start_time TIMESTAMPTZ,
    update_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    session_time INT NOT NULL DEFAULT 0,
    input_octets BIGINT NOT NULL DEFAULT 0,
    output_octets BIGINT NOT NULL DEFAULT 0,
    input_gigawords INT NOT NULL DEFAULT 0,
    output_gigawords INT NOT NULL DEFAULT 0,
    terminate_cause VARCHAR(50),
    ap_name VARCHAR(100),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_radacct_username ON radacct(username);
CREATE INDEX idx_radacct_session_id ON radacct(session_id);
CREATE INDEX idx_radacct_start_time ON radacct(start_time);
CREATE INDEX idx_radacct_active ON radacct(username, tenant_id) WHERE stop_time IS NULL;
CREATE INDEX idx_radacct_nas ON radacct(nas_id) WHERE stop_time IS NULL;

-- Radpostauth (Auth Attempt Log)
CREATE TABLE radpostauth (
    id BIGSERIAL PRIMARY KEY,
    username CITEXT NOT NULL,
    pass VARCHAR(255),
    reply VARCHAR(50),
    nas_ip INET,
    nas_id UUID REFERENCES nas_devices(id) ON DELETE SET NULL,
    calling_station VARCHAR(50),
    auth_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_radpostauth_username ON radpostauth(username);
CREATE INDEX idx_radpostauth_date ON radpostauth(auth_date);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number SERIAL,
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    type invoice_type NOT NULL DEFAULT 'cash',
    gateway VARCHAR(50),
    gateway_txn_id VARCHAR(255),
    service_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL DEFAULT 1,
    quantity INT NOT NULL DEFAULT 1,
    net_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,4) NOT NULL DEFAULT 0,
    gross_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    remark TEXT,
    comment TEXT,
    payment_date TIMESTAMPTZ,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_subscriber ON invoices(subscriber_id);
CREATE INDEX idx_invoices_manager ON invoices(manager_id);
CREATE INDEX idx_invoices_tenant_date ON invoices(tenant_id, created_at);

-- Card Series
CREATE TABLE card_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT '',
    card_type card_type NOT NULL DEFAULT 'classic',
    quantity INT NOT NULL DEFAULT 0,
    gross_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    valid_till DATE,
    prefix VARCHAR(20) NOT NULL DEFAULT '',
    pin_length SMALLINT NOT NULL DEFAULT 8,
    password_length SMALLINT NOT NULL DEFAULT 6,
    plan_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    group_id UUID REFERENCES user_groups(id) ON DELETE SET NULL,
    dl_limit_mb BIGINT NOT NULL DEFAULT 0,
    ul_limit_mb BIGINT NOT NULL DEFAULT 0,
    total_limit_mb BIGINT NOT NULL DEFAULT 0,
    time_limit_secs INT NOT NULL DEFAULT 0,
    expiry_mode expiry_mode NOT NULL DEFAULT 'fixed',
    activation_time_secs INT NOT NULL DEFAULT 0,
    sim_use INT NOT NULL DEFAULT 1,
    sms_verify BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cards
CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    series_id UUID NOT NULL REFERENCES card_series(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pin VARCHAR(50) NOT NULL,
    password VARCHAR(50),
    status card_status NOT NULL DEFAULT 'active',
    activated_by UUID REFERENCES subscribers(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, pin)
);

CREATE INDEX idx_cards_series ON cards(series_id);
CREATE INDEX idx_cards_status ON cards(status);

-- IAS Templates
CREATE TABLE ias_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    plan_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    dl_limit_mb BIGINT NOT NULL DEFAULT 0,
    ul_limit_mb BIGINT NOT NULL DEFAULT 0,
    total_limit_mb BIGINT NOT NULL DEFAULT 0,
    time_limit_secs INT NOT NULL DEFAULT 0,
    expiry_date TIMESTAMPTZ,
    expiry_mode expiry_mode NOT NULL DEFAULT 'from_activation',
    activation_time_secs INT NOT NULL DEFAULT 3600,
    sim_use INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service Changes
CREATE TABLE service_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES managers(id) ON DELETE SET NULL,
    old_plan_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    new_plan_id UUID REFERENCES service_plans(id) ON DELETE SET NULL,
    schedule_date DATE NOT NULL,
    status service_change_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access Points
CREATE TABLE access_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    access_mode VARCHAR(10) NOT NULL DEFAULT 'snmp',
    snmp_community VARCHAR(100) NOT NULL DEFAULT 'public',
    api_username VARCHAR(100),
    api_password VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMTS Devices
CREATE TABLE cmts_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    snmp_community VARCHAR(100) NOT NULL DEFAULT 'public',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connection Tracking (partitioned by tracked_at)
CREATE TABLE connection_tracking (
    id BIGSERIAL,
    tenant_id UUID NOT NULL,
    subscriber_id UUID,
    username CITEXT NOT NULL,
    src_ip INET NOT NULL,
    src_port INT NOT NULL,
    dst_ip INET NOT NULL,
    dst_port INT NOT NULL,
    protocol SMALLINT NOT NULL DEFAULT 6,
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, tracked_at)
) PARTITION BY RANGE (tracked_at);

-- Create initial partitions (current and next month)
CREATE TABLE connection_tracking_default PARTITION OF connection_tracking DEFAULT;

-- Syslog
CREATE TABLE syslog (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    source VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_syslog_tenant_date ON syslog(tenant_id, created_at);

-- Notification Templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    channel VARCHAR(10) NOT NULL DEFAULT 'email',
    subject VARCHAR(500),
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, slug, channel)
);
