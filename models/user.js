//import mongoose
const mongoose = require('mongoose');
const uniqueValidator=require('mongoose-unique-validator');

//create the schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
    usertype:{type:String,required:true,default:'user'}
});
//we have to add the validator to the schema
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
