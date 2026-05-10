import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI


const connectDB = async () => { 
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log(`\n MobgoDB Connected !! DB Host: ${connectionInstance.connection.host}`);
        // console.log(connectionInstance);
        
        
        
    } catch (error) {
        console.log("MONGODB Connection Error", error);
        process.exit(1);
        
        
    }
}

export default connectDB;