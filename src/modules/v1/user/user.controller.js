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
            res.status(200).json({ message: 'User account deleted successfully.' });
        } catch (err) {
            next(err);
        }
    }

    async listUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const result = await UserService.listUsers({ page, limit });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

export default new UserController();
