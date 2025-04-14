import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Message = mongoose.model('Message', messageSchema);

export default Message; 