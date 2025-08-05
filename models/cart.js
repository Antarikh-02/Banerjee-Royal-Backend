const mongoose = require("mongoose");

const cartSchema = mongoose.Schema(
  {

        product: { type:mongoose.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        count: Number,
      user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: [true, "user id is required"],
      },
      
    
    
    totalPrice: Number,
    date_added: {
      type: Date,
      default: Date.now
  }
});


module.exports = mongoose.model('Cart', cartSchema);
