const { createUser: createUserModel, getUsers: getUsersModel } = require('../models/user');

async function createUser(req, res, next) {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const user = await createUserModel(name || null, email);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await getUsersModel();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, getUsers };
