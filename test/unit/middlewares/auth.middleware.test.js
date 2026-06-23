import test from 'node:test';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import jwt from 'jsonwebtoken';

const makeMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    res.json = (body) => {
      res.jsonBody = body;
      return res;
    };
    return res;
  };
  return res;
};

const makeMockReq = (overrides = {}) => ({
  get: (name) => overrides[name.toLowerCase()],
  ...overrides,
});

test('authenticate returns 401 when no authorization header', async () => {
  const { authenticate } = await esmock('../../../middlewares/auth.middleware.js', {
    '../../../models/prisma.js': {
      default: {},
    },
  });

  const req = makeMockReq({ authorization: undefined });
  const res = makeMockRes();

  await authenticate(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.jsonBody.error, true);
  assert.equal(res.jsonBody.message, 'Unauthorized');
});

test('authenticate returns 401 when token is not Bearer', async () => {
  const { authenticate } = await esmock('../../../middlewares/auth.middleware.js', {
    '../../../models/prisma.js': { default: {} },
  });

  const req = makeMockReq({ authorization: 'Token abc123' });
  const res = makeMockRes();

  await authenticate(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.jsonBody.message, 'Unauthorized');
});

test('authenticate invokes next and sets req.user on valid token', async () => {
  let nextCalled = false;
  const { authenticate } = await esmock('../../../middlewares/auth.middleware.js', {
    'jsonwebtoken': {
      verify: (token, secret) => ({ user_id: 1, role_id: 2 }),
      JsonWebTokenError: Error,
    },
    '../../../models/prisma.js': {
      default: {
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_fullname: 'John Doe',
            usr_username: 'johndoe',
            usr_status: 1,
            usr_isLocked: 0,
            usr_isForced: 0,
            rol_id: 2,
            mst_roles: { rol_name: 'User' },
          }),
        },
      },
    },
  });

  const req = makeMockReq({ authorization: 'Bearer valid.jwt.token' });
  const res = makeMockRes();

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.user_id, 1);
  assert.equal(req.user.username, 'johndoe');
  assert.equal(req.user.role_id, 2);
  assert.equal(req.user.role_name, 'User');
  assert.equal(req.user.isForced, 0);
  assert.equal(req.user.isLocked, 0);
});

test('authenticate returns 401 when user not found in DB', async () => {
  const { authenticate } = await esmock('../../../middlewares/auth.middleware.js', {
    'jsonwebtoken': {
      verify: (token, secret) => ({ user_id: 999, role_id: 2 }),
      JsonWebTokenError: Error,
    },
    '../../../models/prisma.js': {
      default: {
        mst_users: {
          findFirst: async () => null,
        },
      },
    },
  });

  const req = makeMockReq({ authorization: 'Bearer valid.jwt.token' });
  const res = makeMockRes();

  await authenticate(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.jsonBody.message, 'Invalid or expired token');
});

test('authenticate returns 403 when user is locked', async () => {
  const { authenticate } = await esmock('../../../middlewares/auth.middleware.js', {
    'jsonwebtoken': {
      verify: (token, secret) => ({ user_id: 1, role_id: 2 }),
      JsonWebTokenError: Error,
    },
    '../../../models/prisma.js': {
      default: {
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_fullname: 'John Doe',
            usr_username: 'johndoe',
            usr_status: 1,
            usr_isLocked: 1,
            usr_isForced: 0,
            rol_id: 2,
            mst_roles: { rol_name: 'User' },
          }),
        },
      },
    },
  });

  const req = makeMockReq({ authorization: 'Bearer valid.jwt.token' });
  const res = makeMockRes();

  await authenticate(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.jsonBody.message, 'User is locked');
});

test('authenticate returns 401 when JWT verification throws', async () => {
  const { authenticate } = await esmock('../../../middlewares/auth.middleware.js', {
    'jsonwebtoken': {
      verify: (token, secret) => { throw new Error('jwt expired'); },
      JsonWebTokenError: Error,
    },
    '../../../models/prisma.js': {
      default: {
        mst_users: {
          findFirst: async () => null,
        },
      },
    },
  });

  const req = makeMockReq({ authorization: 'Bearer expired.jwt.token' });
  const res = makeMockRes();

  await authenticate(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.jsonBody.message, 'Invalid or expired token');
});

test('signAuthToken produces valid JWT with expected payload', async () => {
  const originalEnv = process.env.JWT_SECRET;
  const longSecret = 'L'.repeat(64);
  process.env.JWT_SECRET = longSecret;

  const { signAuthToken } = await esmock('../../../middlewares/auth.middleware.js', {
    'jsonwebtoken': jwt,
    '../../../models/prisma.js': { default: {} },
  });

  const token = signAuthToken({ user_id: 1, role_id: 2 });
  assert.ok(typeof token === 'string');
  assert.ok(token.split('.').length === 3);

  const decoded = jwt.verify(token, longSecret);
  assert.equal(decoded.user_id, 1);
  assert.equal(decoded.role_id, 2);

  process.env.JWT_SECRET = originalEnv;
});

test('signAuthToken creates token with 1 day expiry', async () => {
  const originalEnv = process.env.JWT_SECRET;
  const longSecret = 'L'.repeat(64);
  process.env.JWT_SECRET = longSecret;

  const { signAuthToken } = await esmock('../../../middlewares/auth.middleware.js', {
    'jsonwebtoken': jwt,
    '../../../models/prisma.js': { default: {} },
  });

  const token = signAuthToken({ user_id: 1, role_id: 2 });
  const decoded = jwt.decode(token);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const tokenAge = decoded.exp * 1000 - decoded.iat * 1000;

  assert.ok(tokenAge <= oneDayMs + 1000, 'Token expiry should be within ~1 day');

  process.env.JWT_SECRET = originalEnv;
});