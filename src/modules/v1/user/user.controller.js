// src/modules/user/user.controller.js
import UserService from './user.service.js';

class UserController {
    async getProfile(req, res, next) {
        try {
        const user = await UserService.getUserById(req.user._id);
        res.json({ user });
        } catch (err) {
        next(err);
        }
    }

    async updateProfile(req, res, next) {
        try {
        const updatedUser = await UserService.updateUser(req.user._id, req.body);
        res.json(updatedUser);
        } catch (err) {
        next(err);
        }
    }

    async deleteUserAccount(req, res, next) {
        try {
        await UserService.deleteUser(req.user._id);
        res.status(204).send();
        } catch (err) {
        next(err);
        }
    }
}

export default new UserController();
