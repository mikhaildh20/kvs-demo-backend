import test from 'node:test';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import bcrypt from 'bcrypt';

test('AuthService.login returns token and user on valid credentials', async () => {
  const passwordHash = await bcrypt.hash('password123', 12);

  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../middlewares/auth.middleware.js': {
      signAuthToken: () => 'mock.jwt.token'
    },
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => ({ rol_id: 1, rol_name: 'Administrator', rol_status: 1 }),
        },
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_username: 'admin',
            usr_fullname: 'Admin User',
            usr_password: passwordHash,
            usr_status: 1,
            usr_isLocked: 0,
            usr_isForced: 0,
            rol_id: 1,
            mst_roles: { rol_name: 'Administrator' }
          }),
        },
      },
    },
  });

  const result = await AuthService.login({ username: 'admin', password: 'password123' });

  assert.ok(result.token, 'Should have a token');
  assert.equal(result.user.username, 'admin');
  assert.equal(result.user.name, 'Admin User');
  assert.equal(result.user.role_name, 'Administrator');
  assert.equal(result.user.isForced, 0);
  assert.equal(result.user.isLocked, 0);
});

test('AuthService.login throws on missing credentials', async () => {
  const { AuthService } = await esmock('../../../services/auth.service.js');

  await assert.rejects(
    () => AuthService.login({ username: '', password: '' }),
    /Username and password are required/
  );
});

test('AuthService.login throws when user not found', async () => {
  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => ({ rol_id: 1, rol_name: 'Administrator', rol_status: 1 }),
        },
        mst_users: {
          findFirst: async () => null,
        },
      },
    },
  });

  await assert.rejects(
    () => AuthService.login({ username: 'nonexistent', password: 'password123' }),
    /Invalid username or password/
  );
});

test('AuthService.login throws when user is inactive', async () => {
  const passwordHash = await bcrypt.hash('password123', 12);

  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => ({ rol_id: 1, rol_name: 'Administrator', rol_status: 1 }),
        },
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_username: 'admin',
            usr_fullname: 'Admin User',
            usr_password: passwordHash,
            usr_status: 0,
            usr_isLocked: 0,
            rol_id: 1,
            mst_roles: { rol_name: 'Administrator' }
          }),
        },
      },
    },
  });

  await assert.rejects(
    () => AuthService.login({ username: 'admin', password: 'password123' }),
    /Pengguna tidak aktif/
  );
});

test('AuthService.login throws when user is locked', async () => {
  const passwordHash = await bcrypt.hash('password123', 12);

  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => ({ rol_id: 1, rol_name: 'Administrator', rol_status: 1 }),
        },
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_username: 'admin',
            usr_fullname: 'Admin User',
            usr_password: passwordHash,
            usr_status: 1,
            usr_isLocked: 1,
            rol_id: 1,
            mst_roles: { rol_name: 'Administrator' }
          }),
        },
      },
    },
  });

  await assert.rejects(
    () => AuthService.login({ username: 'admin', password: 'password123' }),
    /User is locked/
  );
});

test('AuthService.login throws with wrong password', async () => {
  const passwordHash = await bcrypt.hash('password123', 12);

  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => ({ rol_id: 1, rol_name: 'Administrator', rol_status: 1 }),
        },
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_username: 'admin',
            usr_fullname: 'Admin User',
            usr_password: passwordHash,
            usr_status: 1,
            usr_isLocked: 0,
            rol_id: 1,
            mst_roles: { rol_name: 'Administrator' }
          }),
        },
      },
    },
  });

  await assert.rejects(
    () => AuthService.login({ username: 'admin', password: 'wrongpassword' }),
    /Invalid username or password/
  );
});

test('AuthService.seedUser creates new user', async () => {
  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => null,
          create: async (data) => ({
            rol_id: 1,
            rol_name: 'Administrator',
            rol_status: 1
          }),
        },
        mst_users: {
          findFirst: async () => null,
          create: async (args) => ({
            usr_id: 1,
            usr_username: args.data.usr_username,
            usr_fullname: args.data.usr_fullname,
            usr_password: args.data.usr_password,
            usr_status: args.data.usr_status,
            usr_isForced: args.data.usr_isForced,
            usr_isLocked: args.data.usr_isLocked,
            rol_id: args.data.rol_id,
            mst_roles: { rol_name: 'Administrator' }
          }),
        },
      },
    },
  });

  const result = await AuthService.seedUser({
    username: 'admin',
    password: 'password123',
    name: 'System Administrator'
  });

  assert.equal(result.username, 'admin');
  assert.equal(result.name, 'System Administrator');
  assert.equal(result.role_name, 'Administrator');
});

test('AuthService.seedUser updates existing user', async () => {
  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../models/prisma.js': {
      default: {
        mst_roles: {
          findFirst: async () => ({ rol_id: 1, rol_name: 'Administrator', rol_status: 1 }),
        },
        mst_users: {
          findFirst: async () => ({
            usr_id: 1,
            usr_username: 'admin',
            usr_fullname: 'Old User',
          }),
          update: async () => ({
            usr_id: 1,
            usr_username: 'admin',
            usr_fullname: 'Updated User',
            rol_id: 1,
            mst_roles: { rol_name: 'Administrator' }
          }),
        },
      },
    },
  });

  const result = await AuthService.seedUser({
    username: 'admin',
    password: 'newpassword',
    name: 'Updated User'
  });

  assert.equal(result.name, 'Updated User');
});

test('AuthService.seedUser throws without password', async () => {
  const { AuthService } = await esmock('../../../services/auth.service.js');

  await assert.rejects(
    () => AuthService.seedUser({ username: 'admin' }),
    /Seed password is required/
  );
});

test('AuthService.changePasswordSelf delegates to UserService', async () => {
  const { AuthService } = await esmock('../../../services/auth.service.js', {
    '../../../services/user.service.js': {
      UserService: {
        changeOwnPassword: async (payload) => {
          assert.equal(payload.username, 'admin');
          assert.equal(payload.currentPassword, 'oldpass');
          assert.equal(payload.newPassword, 'newpass123');
          return { changed: true };
        },
      },
    },
  });

  const result = await AuthService.changePasswordSelf({
    username: 'admin',
    currentPassword: 'oldpass',
    newPassword: 'newpass123'
  });

  assert.deepEqual(result, { changed: true });
});