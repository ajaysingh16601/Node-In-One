// src/modules/user/user.service.js
import User from './user.model.js';

class UserService {
    async getUserById(id) {
        return await User.findOne({ _id: id, isDeleted: false });
    }

    async updateUser(id, data) {
        const user = await User.findOne({ _id: id, isDeleted: false }).select("-password").select("-googleId");
        if (!user) throw new Error("User not found");
        Object.assign(user, data);
        return await user.save();
    }

    async deleteUser(id) {
        // Soft delete user by setting isDeleted flag
        await User.updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() });
        return { message: 'User account deleted successfully' };
    }

    async listUsers({ page = 1, limit = 10 }) {
        const filter = { isDeleted: false };
        const skip = (page - 1) * limit;
        const users = await User.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await User.countDocuments(filter);
        return {
            users,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

}

export default new UserService();
