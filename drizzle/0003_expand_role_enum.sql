-- Expand the users.role enum to include all 7 portal role values.
-- Old values (user, admin) are retained so existing rows remain valid.
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM(
    'platform_admin',
    'enterprise_admin',
    'superuser',
    'bu_user',
    'site_user',
    'area_user',
    'asset_user',
    'user',
    'admin'
  ) NOT NULL DEFAULT 'bu_user';
