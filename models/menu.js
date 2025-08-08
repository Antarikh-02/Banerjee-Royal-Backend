//import mongoose
const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
//create the schema

const menuSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description:{ type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: {type: String, required: true, trim: true,enum: ['Starter', 'Main Course', 'Biryani', 'Special Biryani', 'Naan', 'Dessert', 'Beverage']},
    vegType: {type: String,required: true,enum: ['Veg', 'Non-Veg'],default: 'Veg'},
    
});

menuSchema.plugin(uniqueValidator);
//export the schema
module.exports = mongoose.model('menu', menuSchema);
