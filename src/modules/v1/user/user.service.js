// src/modules/user/user.service.js
import User from './user.model.js';

class UserService {
    async getUserById(id) {
        return await User.findById(id);
    }

    async updateUser(id, data) {
        return await User.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteUser(id) {
        // Soft delete user by setting isDeleted flag
        await User.updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() });
        return { message: 'User account deleted successfully' };
    }
}

export default new UserService();
