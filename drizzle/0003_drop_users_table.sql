-- Drop the local users table.
-- Authentication is now fully stateless: role and enterpriseId are read directly
-- from the portal JWT claims (embedded by portal PR #13). No local user record
-- is created or looked up on any request.
--
-- Run AFTER deploying the application code that removes all references to this
-- table. Do NOT run before the PR is merged and the new build is published.
DROP TABLE IF EXISTS `users`;
