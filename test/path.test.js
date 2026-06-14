import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePagePath, resolvePagePathFromRequest } from '../utils/path.js';

const mockReq = ({ baseUrl, path = '/', pagePath = null }) => ({
  baseUrl,
  path,
  get(name) {
    return name.toLowerCase() === 'x-page-path' ? pagePath : undefined;
  },
});

test('normalizePagePath removes encrypted dynamic id segments from action pages', () => {
  assert.equal(
    normalizePagePath('/pages/group-menu/detail/U2FsdGVkX1_abcdef123456'),
    '/pages/group-menu/detail'
  );
  assert.equal(
    normalizePagePath('/pages/role/edit/123'),
    '/pages/role/edit'
  );
});

test('resolvePagePathFromRequest maps protected API prefixes to page menu paths without /api menu rows', () => {
  const cases = [
    ['/api/roles', '/pages/role'],
    ['/api/colors', '/pages/color'],
    ['/api/customers', '/pages/customer'],
    ['/api/kanbans', '/pages/kanban'],
    ['/api/oqcs', '/pages/oqc'],
    ['/api/group-menus', '/pages/group-menu'],
    ['/api/users', '/pages/user'],
    ['/api/barcode-delivery-scans', '/pages/barcode-delivery-scan'],
  ];

  for (const [api, page] of cases) {
    assert.equal(resolvePagePathFromRequest(mockReq({ baseUrl: api })), page);
  }
});

test('resolvePagePathFromRequest prefers frontend x-page-path header when present', () => {
  const req = mockReq({
    baseUrl: '/api/group-menus',
    path: '/1/detail',
    pagePath: '/pages/group-menu/detail/U2FsdGVkX1_abcdef123456',
  });

  assert.equal(resolvePagePathFromRequest(req), '/pages/group-menu/detail');
});
