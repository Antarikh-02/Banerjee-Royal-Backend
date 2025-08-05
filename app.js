const express = require('express');
const { check } = require('express-validator');
const cors = require('cors');
const bodyParser = require('body-parser');
//import file moongoose
const mongoPractice = require('./mongoose');
var fs = require('fs');
var path = require('path');
//create the obje4ct of express
const app = express();
//use thge middle ware body parser
app.use(bodyParser.json());
app.use(express.json());
app.use(cors())
var multer = require('multer');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
//creating the storage to uploads the files into the folder upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

//MenuItem Routes-------------------------------------------------------

app.post('/menu/add', mongoPractice.createMenuItem);
app.get('/menu', mongoPractice.getMenus);
app.get('/menu/:mid', mongoPractice.getMenuItemById);
app.patch('/menu/:mid', mongoPractice.updateMenuItem);
app.delete('/menu/:mid', mongoPractice.deleteMenuItem);

//Reservation Routes-----------------------------------------------------

app.post('/reservation/add', mongoPractice.createReservation);
app.get('/reservation', mongoPractice.getReservations);
app.get('/reservation/:id', mongoPractice.getReservationById);
app.patch('/reservation/:id', mongoPractice.updateReservation);
app.delete('/reservation/:id', mongoPractice.deleteReservation);

  app.get('/users', mongoPractice.getUsers);
  app.post('/login', mongoPractice.login);
/* admin url*/
  app.post('/users',[
    check('name')
      .not()
      .isEmpty(),
    check('email')
      .normalizeEmail() // Test@test.com => test@test.com
      .isEmail(),
    check('password').isLength({ min: 6 })
  ], mongoPractice.signup);
  app.post('/adminusers',[
    check('name')
      .not()
      .isEmpty(),
    check('email')
      .normalizeEmail() // Test@test.com => test@test.com
      .isEmail(),
    check('password').isLength({ min: 6 })
  ], mongoPractice.adminsignup);
  
  app.post('/adminlogin', mongoPractice.adminlogin);

  
//open the port the server listen


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
/*


app.delete('/products/:pid', mongoPractice.deleteProductById);*/