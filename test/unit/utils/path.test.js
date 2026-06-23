import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePagePath, resolvePagePathFromRequest } from '../../../utils/path.js';

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

test('normalizePagePath strips query strings and fragments', () => {
  assert.equal(normalizePagePath('/pages/user?tab=info#section'), '/pages/user');
  assert.equal(normalizePagePath('/pages/customer?q=1&sort=name'), '/pages/customer');
});

test('normalizePagePath preserves paths without dynamic segments', () => {
  assert.equal(normalizePagePath('/pages/menu'), '/pages/menu');
  assert.equal(normalizePagePath('/pages/color'), '/pages/color');
  assert.equal(normalizePagePath('/pages/kanban'), '/pages/kanban');
});

test('resolvePagePathFromRequest maps API prefixes to page paths', () => {
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

test('resolvePagePathFromRequest prefers x-page-path header', () => {
  const req = mockReq({
    baseUrl: '/api/group-menus',
    path: '/1/detail',
    pagePath: '/pages/group-menu/detail/U2FsdGVkX1_abcdef123456',
  });

  assert.equal(resolvePagePathFromRequest(req), '/pages/group-menu/detail');
});

test('resolvePagePathFromRequest falls back for unknown API prefixes', () => {
  const req = mockReq({ baseUrl: '/api/unknown', path: '/test' });
  const result = resolvePagePathFromRequest(req);
  assert.equal(result.includes('/unknown'), true);
});