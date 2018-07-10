const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");

//Load user model

const User = require("../../models/User");

//Load Token Keys

const keys = require("../../config/keys");

//Load Input Validation

const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

// @route Get api/users/test
// @desc Tests users route
// @access Public
router.get("/test", (req, res) => res.json({ msg: "Users Works" }));

// @route Get api/users/register
// @desc Register users
// @access Public
router.post("/register", (req, res) => {
  // Poll errors is valid

  const { errors, isValid } = validateRegisterInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  // Find the Suer to check if it already exists or create a new one

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      errors.email = `Email ${user.email} already exists`;
      return res.status(400).json(errors);
    } else {
      const avatar = gravatar.url(req.body.email, {
        s: "200", //Size
        r: "pq", // Rating
        d: "mm" //Default
      });

      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        avatar,
        password: req.body.password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) {
            throw err;
          }
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});

// @route Get api/users/login
// @desc Log in User / Return the JWT Json WebToken
// @access Public

router.post("/login", (req, res) => {
  // Poll errors is valid

  const { errors, isValid } = validateLoginInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  //Find User by email
  User.findOne({ email: email }).then(user => {
    if (!user) {
      errors.email = "User not Found!";
      return res.status(404).json(errors);
    } else {
      bcrypt.compare(password, user.password).then(isMatch => {
        if (isMatch) {
          //User Mathced
          //Create PayLoad
          const payload = { id: user, name: user.name, avatar: user.avatar };
          //Sign Token
          jwt.sign(
            payload,
            keys.secretOrKey,
            { expiresIn: 3600 },
            (err, tokens) => {
              res.json({
                success: true,
                token: `Bearer ${tokens}`
              });
            }
          );
        } else {
          errors.password = "Password is Wrong";
          return res.status(400).json(errors);
        }
      });
    }
  });
});

// @route Get api/users/current
// @desc Return current user
// @access Private

router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    });
  }
);

module.exports = router;
