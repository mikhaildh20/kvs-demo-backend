import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const menuModelSource = fs.readFileSync(new URL('../models/menu.model.js', import.meta.url), 'utf8');

test('menu creation backfills Administrator detail_menu access', () => {
  assert.match(menuModelSource, /const ensureAdministratorMenuAccess/);
  assert.match(menuModelSource, /rol_name:\s*"Administrator"/);
  assert.match(menuModelSource, /tx\.detail_menu\.upsert/);
  assert.match(menuModelSource, /prisma\.\$transaction\(async \(tx\) => \{\s*const menu = await tx\.mst_menus\.create/s);
  assert.match(menuModelSource, /await ensureAdministratorMenuAccess\(tx, menu\.mnu_id, userFullname\)/);
});

test('reactivating a menu restores Administrator detail_menu access', () => {
  assert.match(menuModelSource, /const updatedMenu = await tx\.mst_menus\.update/s);
  assert.match(menuModelSource, /if \(updatedMenu\.mnu_status === 1\) \{\s*await ensureAdministratorMenuAccess\(tx, updatedMenu\.mnu_id, userFullname\);\s*\}/s);
});
