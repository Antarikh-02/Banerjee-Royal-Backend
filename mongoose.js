//import the mongoose library
const mongoose = require('mongoose');
const fs=require("fs");
const path=require("path");
//bycryptjs-------------------------
const bycryptjs=require('bcryptjs');
//import the from the models the products----------------
const Menu = require('./models/menu');
const Reservation = require('./models/reservationSchema');
// for users
//const uuid = require('uuid/v4');
const { validationResult } = require('express-validator');

const HttpError = require('./models/http-error');
const User = require('./models/user');
const { required } = require('nodemon/lib/config');

//try to connect with mongodb
mongoose.connect('mongodb+srv://bantarikh:xUBpFBnaEX8JJ9Mb@cluster1.idpvowb.mongodb.net/')
.then(() => {
  console.log('Connected to database!');
})
.catch((err) => {
  console.error('Connection failed!', err);
});

//MenuItem Controller------------------------------------------------------


const VALID_CATEGORIES = ['Starter', 'Main Course', 'Dessert', 'Beverage'];
const VALID_VEG_TYPES = ['Veg', 'Non-Veg'];
exports.createMenuItem = async (req, res, next) => {
  console.log("Request Body:", req.body);

  const { name, description, price, image, category, vegType } = req.body;

  if (!category || !vegType) {
    return res.status(400).json({ message: "Category and vegType are required." });
  }

  const trimmedCategory = category.trim();
  const trimmedVegType = vegType.trim();

  if (!VALID_CATEGORIES.includes(trimmedCategory)) {
    return res.status(400).json({
      message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}.`,
    });
  }

  if (!VALID_VEG_TYPES.includes(trimmedVegType)) {
    return res.status(400).json({
      message: `Invalid vegType. Must be one of: ${VALID_VEG_TYPES.join(', ')}.`,
    });
  }

  try {
    const newItem = new Menu({
      name,
      description,
      price,
      image,
      category: trimmedCategory,
      vegType: trimmedVegType,
    });

    await newItem.save();
    res.status(201).json({ message: "Menu item created", data: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Creating menu item failed." });
  }
};

// ✅ Get all menus
exports.getMenus = async (req, res, next) => {
  try {
    const menus = await Menu.find();
    if (!menus || menus.length === 0) {
      return next(new HttpError('No menu items found.', 404));
    }
    res.json({ menus: menus.map(item => item.toObject({ getters: true })) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Fetching menus failed.', 500));
  }
};

// ✅ Get menu by ID
exports.getMenuItemById = async (req, res, next) => {
  const menuId = req.params.mid;
  console.log("GET by ID:", menuId);

  if (!mongoose.Types.ObjectId.isValid(menuId)) {
    return next(new HttpError('Invalid menu item ID.', 422));
  }

  try {
    const menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      return next(new HttpError('Menu item not found.', 404));
    }
    res.json({ menu: menuItem.toObject({ getters: true }) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Fetching menu item failed.', 500));
  }
};

// ✅ Update menu item
exports.updateMenuItem = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed.', 422)
    );
  }

  const menuId = req.params.mid;
  const { name, description, price, image, category, vegType, isAvailable } = req.body;
  console.log("UPDATE ID:", menuId);

  if (!mongoose.Types.ObjectId.isValid(menuId)) {
    return next(new HttpError('Invalid menu item ID.', 422));
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    return next(
      new HttpError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}.`, 422)
    );
  }

  if (vegType && !VALID_VEG_TYPES.includes(vegType)) {
    return next(
      new HttpError(`Invalid vegType. Must be one of: ${VALID_VEG_TYPES.join(', ')}.`, 422)
    );
  }

  try {
    const menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      return next(new HttpError('Menu item not found.', 404));
    }

    if (name) menuItem.name = name.trim();
    if (description) menuItem.description = description.trim();
    if (price !== undefined) menuItem.price = price;
    if (image) menuItem.image = image.trim();
    if (category) menuItem.category = category;
    if (vegType) menuItem.vegType = vegType;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;

    await menuItem.save();
    res.status(200).json({ menu: menuItem.toObject({ getters: true }) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Updating menu item failed.', 500));
  }
};

// ✅ Delete menu item
exports.deleteMenuItem = async (req, res, next) => {
  const menuId = req.params.mid;
  console.log("DELETE ID:", menuId);

  if (!mongoose.Types.ObjectId.isValid(menuId)) {
    return next(new HttpError('Invalid menu item ID.', 422));
  }

  let menuItem;
  try {
    menuItem = await Menu.findById(menuId);
    if (!menuItem) {
      return next(new HttpError('Menu item not found.', 404));
    }

    // ✅ Use deleteOne instead of remove
    await menuItem.deleteOne();
    res.json({ message: 'Menu item deleted successfully.' });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Deleting menu item failed.', 500));
  }
};

//Reservation Controller------------------------------------------------------

exports.createReservation = async (req, res, next) => {
  // 1) express-validator check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { name, phone, email, date, timeSlot, guests, specialRequest } = req.body;

  // 2) required fields
  if (!name || !phone || !email || !date || !timeSlot || !guests) {
    return next(new HttpError('Missing required reservation fields.', 422));
  }

  // 3) no past dates
  const bookingDate = new Date(date);
  const today = new Date(); today.setHours(0,0,0,0);
  if (bookingDate < today) {
    return next(new HttpError('Reservation date must be today or later.', 422));
  }

  // 4) create & save
  try {
    const newReservation = new Reservation({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      date: bookingDate,
      timeSlot: timeSlot.trim(),
      guests,
      specialRequest: specialRequest ? specialRequest.trim() : undefined
    });
    await newReservation.save();
    return res.status(201).json({ reservation: newReservation.toObject({ getters: true }) });
  } catch (err) {
    // 5) handle duplicate‐key on the compound index
    if (err.code === 11000) {
      return next(new HttpError(
        'You already have a reservation for that date & time.',
        422
      ));
    }
    console.error(err);
    return next(new HttpError('Creating reservation failed, please try again later.', 500));
  }
};

/**
 * GET /reservation
 */
exports.getReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find().sort({ date: 1, timeSlot: 1 });
    if (!reservations.length) {
      return res.status(404).json({ message: 'No reservations found.' });
    }
    return res.json({ reservations: reservations.map(r => r.toObject({ getters: true })) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Fetching reservations failed, please try again later.', 500));
  }
};

/**
 * GET /reservation/:id
 */
exports.getReservationById = async (req, res, next) => {
  const resId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(resId)) {
    return next(new HttpError('Invalid reservation ID.', 422));
  }
  try {
    const reservation = await Reservation.findById(resId);
    if (!reservation) {
      return next(new HttpError('Reservation not found.', 404));
    }
    return res.json({ reservation: reservation.toObject({ getters: true }) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Fetching reservation failed, please try again later.', 500));
  }
};

/**
 * PATCH /reservation/:id
 */
// controllers/reservationController.js

exports.updateReservation = async (req, res, next) => {
  // 1) Validate request body (if you have express-validator rules)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  // 2) Validate reservation ID
  const resId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(resId)) {
    return next(new HttpError('Invalid reservation ID.', 422));
  }

  // 3) Whitelist fields allowed to change
  const allowed = [
    'name',
    'phone',
    'email',
    'date',
    'timeSlot',
    'guests',
    'specialRequest',
    'status'
  ];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      let val = req.body[key];
      // Trim strings
      if (typeof val === 'string') {
        val = val.trim();
      }
      // Parse date
      if (key === 'date') {
        val = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (val < today) {
          return next(new HttpError('Reservation date must be today or later.', 422));
        }
      }
      // Validate status
      if (key === 'status' && !['Pending', 'Confirmed', 'Cancelled'].includes(val)) {
        return next(new HttpError('Invalid status value.', 422));
      }
      updates[key] = val;
    }
  }

  // 4) Perform the update
  let updated;
  try {
    updated = await Reservation.findByIdAndUpdate(
      resId,
      { $set: updates },
      { new: true, runValidators: true }
    );
  } catch (err) {
    console.error(err);
    return next(new HttpError('Updating reservation failed, please try again later.', 500));
  }

  if (!updated) {
    return next(new HttpError('Reservation not found.', 404));
  }

  // 5) Return the updated reservation
  res.json({ reservation: updated.toObject({ getters: true }) });
};


/**
 * DELETE /reservation/:id
 */
exports.deleteReservation = async (req, res, next) => {
  const resId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(resId)) {
    return next(new HttpError('Invalid reservation ID.', 422));
  }
  try {
    const reservation = await Reservation.findById(resId);
    if (!reservation) {
      return next(new HttpError('Reservation not found.', 404));
    }
    await reservation.remove();
    return res.json({ message: 'Reservation deleted successfully.' });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Deleting reservation failed, please try again later.', 500));
  }
};


const getUsers = async (req, res) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    
      const errorMessage='Fetching users failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
  

  }
  res.json({users: users.map(user => user.toObject({ getters: true }))});
};

const adminsignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    
    const errorMessage='Invalid inputs passed, please check your data.';
    return res.status(422).json({ message: errorMessage });
  }
  const { name, email, password ,usertype} = req.body;

  let existingUser
  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    
    return res.status(500).json({ message: 'Signing up failed, please try again later.' });
  }
  
  if (existingUser) {
    
    const errorMessage='User exists already, please login instead.';
    return res.status(422).json({ message: errorMessage });
  }
  //let hashPassword;
  //hashPassword=await bycryptjs.hash(password,12);
  const createdUser = new User({
    name,
    email,

    //password:hashPassword,
    password,
    products:[],
    usertype
  });

  try {
    await createdUser.save();
  } catch (err) {
    
    const errorMessage='Signing up failed, please try again.';
    return res.status(422).json({ message: errorMessage });
  }

 return res.status(201).json({user: createdUser.toObject({ getters: true })});
};
const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    
    const errorMessage='Invalid inputs passed, please check your data.';
    return res.status(422).json({ message: errorMessage });
  }
  const { name, email, password } = req.body;

  let existingUser
  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    
    return res.status(500).json({ message: 'Signing up failed, please try again later.' });
  }
  
  if (existingUser) {
    
    const errorMessage='User exists already, please login instead.';
    return res.status(422).json({ message: errorMessage });
  }
  //let hashPassword;
  //hashPassword=await bycryptjs.hash(password,12);
  const createdUser = new User({
    name,
    email,
    //password:hashPassword,
    password,
    products:[]
  });

  try {
    await createdUser.save();
  } catch (err) {
    
    const errorMessage='Signing up failed, please try again.';
    return res.status(422).json({ message: errorMessage });
  }

  return res.status(201).json({user: createdUser.toObject({ getters: true })});
};

const login = async (req, res) => {
  //console.log("fired"+email);
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    const errorMessage='Logging in failed, please try again later.';
    return res.status(500).json({ message: errorMessage });
  };
  
  /*
let isValidpassword;
isValidpassword=await bycryptjs.compare(password,existingUser.password)
if(!isValidpassword)
{
  
     const errorMessage='Invalid credentials, could not log you in.';
 
  return res.status(401).json({ message: errorMessage });
}
*/
  if (!existingUser || existingUser.password !== password ||existingUser.usertye=='admin') {
    const errorMessage='Invalid User name & password, could not log you in.';
 
    return res.status(401).json({ message: errorMessage });
  }

  return res.status(200).json({ user: existingUser.toObject({ getters: true }) });
};

const adminlogin = async (req, res) => {
  //console.log("fired"+email);
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    const errorMessage='Logging in failed, please try again later.';
    return res.status(500).json({ message: errorMessage });
  };
  
  /*
let isValidpassword;
isValidpassword=await bycryptjs.compare(password,existingUser.password)
if(!isValidpassword)
{
  
     const errorMessage='Invalid credentials, could not log you in.';
 
  return res.status(401).json({ message: errorMessage });
}
*/
//console.log(existingUser);
  if (!existingUser || existingUser.password !== password ||existingUser.usertype !=="admin") {
    const errorMessage='Invalid User name & password, could not log you in.';
 
    return res.status(401).json({ message: errorMessage });
  }

  return res.status(200).json({ user: existingUser.toObject({ getters: true }) });
};
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.adminlogin = adminlogin;
exports.adminsignup = adminsignup;
