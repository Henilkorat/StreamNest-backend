import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile:{
        type: String,
        required: false // Optional, can be removed in future if we strictly rely on masterPlaylistUrl
    },
    thumbnail:{
        type: String,
        required: true
    },
    thumbnailPublicId:{
        type: String,
        required: true
    },
    videoPublicId:{
        type: String,
        required: false // Optional
    },
    masterPlaylistUrl: {
        type: String,
        required: false
    },
    qualities: {
        type: [String],
        default: []
    },
    processingStatus: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    owner:{
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true
    },
    title:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    duration:{
        type: Number,
        required: true
    },
    views:{
        type: Number,
        default: 0
    },
    isPublished:{
        type: Boolean,
        default: true
    }

},{timestamps: true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);