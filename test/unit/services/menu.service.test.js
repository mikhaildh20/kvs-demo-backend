import test from 'node:test';
import assert from 'node:assert/strict';
import esmock from 'esmock';

test('MenuService.getMenusByRole returns filtered menu list', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/prisma.js': {
      default: {
        detail_menu: {
          findMany: async () => [
            {
              mst_menus: {
                mnu_id: 1,
                mnu_name: 'Dashboard',
                mnu_path: '/pages/dashboard',
                mnu_icon: 'FaHome',
                grm_id: 1,
                mst_group_menu: { grm_name: 'Main Menu' },
              },
            },
            {
              mst_menus: {
                mnu_id: 2,
                mnu_name: 'Report',
                mnu_path: '/pages/report',
                mnu_icon: 'FaFile',
                grm_id: 2,
                mst_group_menu: { grm_name: 'Reports' },
              },
            },
          ],
        },
      },
    },
  });

  const result = await MenuService.getMenusByRole(1);

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 1);
  assert.equal(result[0].name, 'Dashboard');
  assert.equal(result[0].path, '/pages/dashboard');
  assert.equal(result[0].icon, 'FaHome');
  assert.equal(result[0].groupName, 'Main Menu');
});

test('MenuService.getMenusByRole filters out non-page-level paths', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/prisma.js': {
      default: {
        detail_menu: {
          findMany: async () => [
            {
              mst_menus: {
                mnu_id: 1,
                mnu_name: 'Dashboard',
                mnu_path: '/pages/dashboard',
                mnu_icon: 'FaHome',
                grm_id: 1,
                mst_group_menu: { grm_name: 'Main' },
              },
            },
            {
              mst_menus: {
                mnu_id: 2,
                mnu_name: 'Nested',
                mnu_path: '/pages/some/nested/path',
                mnu_icon: 'FaInfo',
                grm_id: 1,
                mst_group_menu: { grm_name: 'Main' },
              },
            },
            {
              mst_menus: {
                mnu_id: 3,
                mnu_name: 'NullPath',
                mnu_path: '',
                mnu_icon: 'FaX',
                grm_id: 1,
                mst_group_menu: { grm_name: 'Main' },
              },
            },
          ],
        },
      },
    },
  });

  const result = await MenuService.getMenusByRole(1);

  assert.equal(result.length, 1);
  assert.equal(result[0].path, '/pages/dashboard');
});

test('MenuService.getAccessPathsByRole returns only paths', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/prisma.js': {
      default: {
        detail_menu: {
          findMany: async () => [
            { mst_menus: { mnu_path: '/pages/dashboard' } },
            { mst_menus: { mnu_path: null } },
            { mst_menus: { mnu_path: '/pages/users' } },
          ],
        },
      },
    },
  });

  const result = await MenuService.getAccessPathsByRole(1);

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 2);
  assert.ok(result.includes('/pages/dashboard'));
  assert.ok(result.includes('/pages/users'));
});

test('MenuService.getAll returns paged menu data', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/menu.model.js': {
      MenuModel: {
        findPaged: async () => ({
          data: [
            { mnu_id: 1, mnu_name: 'Test Menu', mnu_path: '/pages/test', mnu_icon: 'icon', mnu_status: 1 },
            { mnu_id: 2, mnu_name: 'Another Menu', mnu_path: '/pages/another', mnu_icon: 'icon2', mnu_status: 0 },
          ],
          totalData: 2,
        }),
      },
    },
  });

  const result = await MenuService.getAll({ page: 1, limit: 10 });

  assert.ok(Array.isArray(result.data));
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].Id, 1);
  assert.equal(result.data[0].Name, 'Test Menu');
  assert.equal(result.data[0].Status, 1);
});

test('MenuService.getById returns mapped menu', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/menu.model.js': {
      MenuModel: {
        findById: async (id) => {
          if (id === 1) return { mnu_id: 1, mnu_name: 'Test', mnu_path: '/pages/test', mnu_icon: 'icon', mnu_status: 1 };
          return null;
        },
      },
    },
  });

  const result = await MenuService.getById('1');

  assert.equal(result.Id, 1);
  assert.equal(result.Name, 'Test');
  assert.equal(result.Path, '/pages/test');
});

test('MenuService.getById throws for not found', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/menu.model.js': {
      MenuModel: {
        findById: async () => null,
      },
    },
  });

  await assert.rejects(
    () => MenuService.getById('999'),
    /Menu not found/
  );
});

test('MenuService.create validates payload (missing name)', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js');

  await assert.rejects(
    () => MenuService.create({ name: '', path: '/pages/test', icon: 'icon' }, 'admin'),
    /Menu name is required/
  );
});

test('MenuService.create validates payload (path not starting with /pages/)', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js');

  await assert.rejects(
    () => MenuService.create({ name: 'Test', path: '/invalid/test', icon: 'icon' }, 'admin'),
    /Menu path must start with \/pages\//
  );
});

test('MenuService.update validates payload', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js');

  await assert.rejects(
    () => MenuService.update('1', { name: '', path: '/pages/test', icon: 'icon' }, 'admin'),
    /Menu name is required/
  );
});

test('MenuService.toggleStatus calls model toggle', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/menu.model.js': {
      MenuModel: {
        toggleStatus: async () => ({ mnu_id: 1, mnu_name: 'Test', mnu_path: '/pages/test', mnu_icon: 'icon', mnu_status: 0 }),
      },
    },
  });

  const result = await MenuService.toggleStatus('1', 'admin');

  assert.equal(result.Id, 1);
  assert.equal(result.Status, 0);
});

test('MenuService.getMenuRowsByRole returns rows', async () => {
  const { MenuService } = await esmock('../../../services/menu.service.js', {
    '../../../models/prisma.js': {
      default: {
        detail_menu: {
          findMany: async () => [
            {
              mnu_id: 1,
              mst_menus: {
                mnu_name: 'Dashboard',
                mnu_path: '/pages/dashboard',
                mnu_icon: 'FaHome',
                mnu_status: 1,
                mst_group_menu: { grm_name: 'Main Menu' },
              },
            },
          ],
        },
      },
    },
  });

  const result = await MenuService.getMenuRowsByRole(1);

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 1);
  assert.equal(result[0].mst_menus.mnu_name, 'Dashboard');
});