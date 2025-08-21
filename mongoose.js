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


const VALID_CATEGORIES = ['Starter', 'Main Course', 'Biryani', 'Special Biryani', 'Naan', 'Dessert', 'Beverage'];
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
  // 1) Validation checks (express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  // 2) Required fields from body
  let { name, phone, email, date, timeSlot, guests, specialRequest } = req.body;
  if (!name || !phone || !email || !date || !timeSlot || !guests) {
    return next(new HttpError('Missing required reservation fields.', 422));
  }

  // 3) Date must be today or later
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(bookingDate.getTime()) || bookingDate < today) {
    return next(new HttpError('Reservation date must be today or later.', 422));
  }

  // 4) Optional authenticated user: support guest bookings
  const userId = req.user && (req.user.id || req.user._id) ? (req.user.id || req.user._id) : null;

  // 5) If userId present, ensure user exists (defensive)
  let user = null;
  if (userId) {
    try {
      user = await User.findById(userId);
      if (!user) user = null; // treat missing user as guest
    } catch (err) {
      console.error('Error verifying user (continuing as guest):', err);
      user = null;
    }
  }

  // 6) Normalize inputs and prefer authenticated user's name/email if available
  name = (req.user && req.user.name && req.user.name.trim()) || name.trim();
  email = (req.user && req.user.email && req.user.email.toLowerCase().trim()) || email.toLowerCase().trim();
  phone = phone.trim();
  timeSlot = timeSlot.trim();
  specialRequest = specialRequest ? specialRequest.trim() : undefined;

  // 7) Create & save reservation (user optional)
  const newReservation = new Reservation({
    user: user ? user._id : undefined,
    name,
    phone,
    email,
    date: bookingDate,
    timeSlot,
    guests,
    specialRequest
  });

  try {
    await newReservation.save();
    await newReservation.populate('user', 'name email'); // populate for response
    return res.status(201).json({ reservation: newReservation.toObject({ getters: true }) });
  } catch (err) {
    // Duplicate-key (compound index) handling
    if (err.code === 11000) {
      return next(new HttpError('That phone/date/time is already booked. Please choose another slot.', 409));
    }
    console.error('Saving reservation failed:', err);
    return next(new HttpError('Creating reservation failed, please try again later.', 500));
  }
};

exports.getReservations = async (req, res, next) => {
  // If you have authentication, req.user will exist; otherwise we return all reservations
  const userId = req.user && (req.user.id || req.user._id);
  const isAdmin = req.user && req.user.usertype === 'admin';

  try {
    let reservations;
    if (userId) {
      if (isAdmin) {
        // admin -> all
        reservations = await Reservation.find()
          .populate('user', 'name email')
          .sort({ date: 1, timeSlot: 1, createdAt: -1 });
      } else {
        // logged-in regular user -> only their reservations
        reservations = await Reservation.find({ user: userId })
          .populate('user', 'name email')
          .sort({ date: 1, timeSlot: 1 });
      }
    } else {
      // no auth provided -> return all (so frontend/admin view works without token)
      reservations = await Reservation.find()
        .populate('user', 'name email')
        .sort({ date: 1, timeSlot: 1, createdAt: -1 });
    }

    // always return an array
    return res.status(200).json({ reservations: reservations.map(r => r.toObject({ getters: true })) });
  } catch (err) {
    console.error('getReservations ERROR:', err);
    return next(new HttpError('Fetching reservations failed, please try again later.', 500));
  }
};


exports.getReservationById = async (req, res, next) => {
  const resId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(resId)) {
    return next(new HttpError('Invalid reservation ID.', 422));
  }

  const userId = req.user && req.user.id;
  if (!userId) {
    return next(new HttpError('Authentication required.', 401));
  }

  try {
    const reservation = await Reservation.findById(resId).populate('user', 'name email');
    if (!reservation) {
      return next(new HttpError('Reservation not found.', 404));
    }

    // Authorization: owner or admin
    if (reservation.user && reservation.user._id.toString() !== userId && req.user.usertype !== 'admin') {
      return next(new HttpError('You are not allowed to view this reservation.', 403));
    }

    return res.json({ reservation: reservation.toObject({ getters: true }) });
  } catch (err) {
    console.error(err);
    return next(new HttpError('Fetching reservation failed, please try again later.', 500));
  }
};

exports.getReservationsByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return next(new HttpError('Invalid user id.', 422));
  }

  try {
    const reservations = await Reservation.find({ user: userId })
      .populate('user', 'name email')
      .sort({ date: 1, timeSlot: 1, createdAt: -1 });

    return res.status(200).json({
      reservations: reservations.map(r => r.toObject({ getters: true }))
    });
  } catch (err) {
    console.error('Fetching reservations by userId failed', err);
    return next(new HttpError('Fetching reservations failed, please try again later.', 500));
  }
};

/**
 * PATCH /reservations/:id
 * Owners may update most fields for their reservations; only admin may set arbitrary status.
 * Owners can cancel (set status to 'Cancelled'). Admins can set status to 'Pending'|'Confirmed'|'Cancelled'.
 */
exports.updateReservation = async (req, res, next) => {
  // 1) Validation checks
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  // 2) Validate reservation ID
  const resId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(resId)) {
    return next(new HttpError('Invalid reservation ID.', 422));
  }

  // 3) Fetch reservation
  let reservation;
  try {
    reservation = await Reservation.findById(resId);
    if (!reservation) {
      return next(new HttpError('Reservation not found.', 404));
    }
  } catch (err) {
    console.error('Fetching reservation failed:', err);
    return next(new HttpError('Fetching reservation failed, please try again later.', 500));
  }

  // 4) Whitelist updatable fields
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
      if (typeof val === 'string') val = val.trim();

      // date check
      if (key === 'date') {
        val = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(val.getTime()) || val < today) {
          return next(new HttpError('Reservation date must be today or later.', 422));
        }
      }

      // status check
      if (key === 'status') {
        const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled'];
        if (!allowedStatuses.includes(val)) {
          return next(new HttpError('Invalid status value.', 422));
        }
      }

      updates[key] = val;
    }
  }

  // 5) Save updates
  try {
    Object.assign(reservation, updates);
    await reservation.save();
    return res.json({ reservation: reservation.toObject({ getters: true }) });
  } catch (err) {
    console.error('Updating reservation failed:', err);
    if (err.code === 11000) {
      return next(
        new HttpError('That phone/date/time is already booked. Please choose another slot.', 409)
      );
    }
    return next(new HttpError('Updating reservation failed, please try again later.', 500));
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedReservation = await Reservation.findByIdAndDelete(id);

    if (!deletedReservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json({ message: "Reservation deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// User Controller-------------------------------------------------------------

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

// ------------------------------------------------------------------------------------------------

const AdmingetUsers = async (req, res) => {
  let users;
  try {
    users = await Admin.find({}, '-password');
  } catch (err) {
    
      const errorMessage='Fetching users failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
  

  }
  res.json({users: users.map(Admin => Admin.toObject({ getters: true }))});
};
// ------------------------------------------------------------------------------------------
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
    const createdUser = new Admin({
      name,
      email,
      password,
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
    const { name, email, password, usertype } = req.body;
  
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
  
  const login = async (req, res) => {
    const { email, password } = req.body;
  
    let existingUser;
  
    try {
      existingUser = await User.findOne({ email: email });
    } catch (err) {
      const errorMessage = 'Logging in failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
    }
  
    // Ensure there's no usertype === 'admin' check for regular user login
    if (!existingUser || existingUser.password !== password) {
      const errorMessage = 'Invalid username or password, could not log you in.';
      return res.status(401).json({ message: errorMessage });
    }
  
    return res.status(201).json({ user: existingUser.toObject({ getters: true }) });
  };
  
  
 const adminlogin = async (req, res) => {
    //console.log("fired"+email);
    const { email, password } = req.body;
  
    let existingAdmin;
  
    try {
      existingAdmin = await Admin.findOne({ email: email })
    } catch (err) {
      const errorMessage='Logging in failed, please try again later.';
      return res.status(500).json({ message: errorMessage });
    };
    
    if (!existingAdmin || existingAdmin.password !== password ||existingAdmin.usertype !=="Admin") {
      const errorMessage='Invalid User name & password, could not log you in.';
   
      return res.status(401).json({ message: errorMessage });
    }
  
    return res.status(200).json({ Admin: existingAdmin.toObject({ getters: true }) });
  };


exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.adminlogin = adminlogin;
exports.adminsignup = adminsignup;
exports.AdmingetUsers = AdmingetUsers;
