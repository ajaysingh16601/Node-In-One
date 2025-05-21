import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/env.js';

mongoose.connect(config.dbUri)
.then(() => {
    console.log('DB connected');
    app.listen(config.port, () => {
        console.log(`Server running on http://localhost:${config.port}`);
    });
})
.catch(console.error);
