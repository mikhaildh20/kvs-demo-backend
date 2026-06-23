import test from 'node:test';
import assert from 'node:assert/strict';
import esmock from 'esmock';

const makeMockUser = (overrides = {}) => ({
  usr_id: 1,
  usr_username: 'johndoe',
  usr_fullname: 'John Doe',
  usr_status: 1,
  usr_isLocked: 0,
  usr_isForced: 0,
  usr_creadate: new Date().toISOString(),
  rol_id: 1,
  mst_roles: { rol_name: 'Administrator' },
  ...overrides,
});

const mockUserModel = (overrides = {}) => {
  const defaultUser = makeMockUser(overrides.userOverrides);
  return {
    findPaged: async (query) => ({
      data: [defaultUser],
      totalData: 1,
    }),
    findById: async (id) => {
      if (id === 999) return null;
      return defaultUser;
    },
    findByUsername: async (username) => {
      if (username === 'existing') return defaultUser;
      if (username === 'johndoe') return defaultUser;
      return null;
    },
    create: async (data) => makeMockUser({
      usr_id: 2,
      usr_username: data.usr_username,
      usr_fullname: data.usr_fullname,
      rol_id: data.rol_id,
    }),
    update: async (id, data) => makeMockUser({
      usr_id: id,
      usr_status: data.usr_status !== undefined ? data.usr_status : 1,
      usr_isLocked: data.usr_isLocked !== undefined ? data.usr_isLocked : 0,
      rol_id: data.rol_id !== undefined ? data.rol_id : 1,
    }),
    getRoleOptions: async () => [
      { rol_id: 1, rol_name: 'Administrator' },
      { rol_id: 2, rol_name: 'Operator' },
    ],
  };
};

const loadService = async (userModelOverrides) => {
  return esmock('../../../services/user.service.js', {
    '../../../models/user.model.js': {
      UserModel: mockUserModel(userModelOverrides),
    },
    '../../../utils/encryptor.js': {
      decryptIdUrl: (val) => val,
    },
  });
};

test('UserService.getAll returns mapped user list', async () => {
  const { UserService } = await loadService();
  const result = await UserService.getAll({ page: 1, limit: 10 }, { user_id: 1 });

  assert.ok(Array.isArray(result.data));
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].Id, 1);
  assert.equal(result.data[0].Username, 'johndoe');
  assert.equal(result.data[0].Fullname, 'John Doe');
  assert.equal(result.data[0].RoleName, 'Administrator');
  assert.equal(result.totalData, 1);
});

test('UserService.getById returns mapped user', async () => {
  const { UserService } = await loadService();
  const user = await UserService.getById('1');

  assert.equal(user.Id, 1);
  assert.equal(user.Username, 'johndoe');
  assert.equal(user.Fullname, 'John Doe');
  assert.equal(user.RoleName, 'Administrator');
  assert.equal(user.IsLocked, 0);
  assert.equal(user.IsForced, 0);
});

test('UserService.getById throws for not found', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.getById('999'),
    /User not found/
  );
});

test('UserService.create requires fullname', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.create({ fullname: '', username: 'newuser', roleId: 1 }, 'admin'),
    /Full name is required/
  );
});

test('UserService.create requires username', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.create({ fullname: 'New User', username: '', roleId: 1 }, 'admin'),
    /Username is required/
  );
});

test('UserService.create requires roleId', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.create({ fullname: 'New User', username: 'newuser', roleId: 0 }, 'admin'),
    /Role is required/
  );
});

test('UserService.create rejects duplicate username', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.create({ fullname: 'Existing User', username: 'existing', roleId: 1 }, 'admin'),
    /Username unavailable/
  );
});

test('UserService.create validates username format', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.create({ fullname: 'Test', username: 'bad user name', roleId: 1 }, 'admin'),
    /Username can only contain/
  );
});

test('UserService.create returns user and generated password', async () => {
  const { UserService } = await loadService();
  const result = await UserService.create(
    { fullname: 'New User', username: 'newuser', roleId: 1 },
    'admin'
  );

  assert.ok(result.user);
  assert.ok(result.generatedPassword);
  assert.equal(typeof result.generatedPassword, 'string');
  assert.ok(result.generatedPassword.length >= 10);
  assert.equal(result.user.Username, 'newuser');
  assert.equal(result.user.Fullname, 'New User');
});

test('UserService.toggleStatus toggles user status', async () => {
  const { UserService } = await loadService();
  const result = await UserService.toggleStatus('1', 'admin');

  assert.equal(result.Id, 1);
  assert.equal(result.Username, 'johndoe');
});

test('UserService.toggleStatus throws for not found', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.toggleStatus('999', 'admin'),
    /User not found/
  );
});

test('UserService.getRoleOptions returns role list', async () => {
  const { UserService } = await loadService();
  const result = await UserService.getRoleOptions();

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { Id: 1, Name: 'Administrator' });
  assert.deepEqual(result[1], { Id: 2, Name: 'Operator' });
});

test('UserService.changeOwnPassword requires all fields', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.changeOwnPassword({ username: 'admin' }),
    /Username, current password, and new password are required/
  );
});

test('UserService.changeOwnPassword enforces minimum password length', async () => {
  const { UserService } = await loadService();

  await assert.rejects(
    () => UserService.changeOwnPassword({
      username: 'admin',
      currentPassword: 'oldpass',
      newPassword: 'short'
    }),
    /New password must be at least 8 characters/
  );
});