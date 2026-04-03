const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../../../config/database");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 50] },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("user", "admin"), defaultValue: "user" },
    phone: { type: DataTypes.STRING },
    date_of_birth: { type: DataTypes.DATEONLY },
    gender: { type: DataTypes.ENUM('male', 'female', 'other') },
    nic: { type: DataTypes.STRING },
    avatar: { type: DataTypes.TEXT, defaultValue: "" },
    address: { type: DataTypes.JSONB, defaultValue: {} },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLogin: { type: DataTypes.DATE },
  },
  {
    tableName: "users",
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed("password_hash")) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
    },
  }
);

// Exclude password_hash from JSON serialization by default
// Also expose travelStyle & interests at the top level from address JSONB
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password_hash;
  if (values.address) {
    if (!values.travelStyle && values.address.travelStyle) values.travelStyle = values.address.travelStyle;
    if (!values.interests && values.address.interests) values.interests = values.address.interests;
    if (!values.preferences && values.address.prefs) values.preferences = values.address.prefs;
  }
  return values;
};

// Verify entered password against hashed password
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

// Generate JWT token
User.prototype.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this.id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

module.exports = User;
