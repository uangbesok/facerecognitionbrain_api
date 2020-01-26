const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.DATABASE_URL,
    ssl: true
    // user: "Straus",
    // password: "",
    // database: "facerecognitionbrain"
  }
});
const clarifai = require("clarifai");

const predictClarifai = new clarifai.App({
    apiKey: "1ca0d57f5fd642e5a84c6bb4e76ea9a8"
  });

const saltRounds = 10;
const app = express();

app.use(express.json());
app.use(cors());

//Method to get clarifai prediction informatio
app.post("/predict", (req, res) => {
    predictClarifai.models
    .predict(clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => res.json(data))
    .catch(error => res.status(404).json("Error. Unable to get prediction"));
})

// SignIn existing user
app.post("/signin", (req, res) => {

    const {email, password} = req.body;
    knex
    .select('email', 'hash')
    .from("logins")
    .where({ email })
    .then(login => 
    {   
        if(login.length)
        {
            return bcrypt.compare(password, login[0].hash)
            .then(isValid => {
                if(isValid)
                {   
                    return knex
                    .select("*")
                    .from("users")
                    .where({ email })
                    .then(user => {
                      user.length 
                      ? res.json(user[0]) 
                      : res.json("Unable to return user information");
                    })
                    .catch(error => res.status(404).json("Error. Unable to get user"));
                }
                else res.json("User name or password is incorrect"); 
            })
            .catch(error => res.status(404).json("Error. Unable to verify the password"));
        }
        else
            res.json("No such user");
    })
    .catch(error => res.status(404).json("Error. Unable to get user"));  
});

//Register new user
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  knex
    .transaction(trx => {
      trx("users")
        .returning("*")
        .insert({
          email: email,
          name: name,
          joined: new Date()
        })
        .then(users => {
          return bcrypt.hash(password, saltRounds).then(hash => {
            return trx("logins")
              .insert({
                hash: hash,
                email: email
              })
              .then(res.json(users[0]));
          });
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch(error => res.status(404).json("Error. Unable to register."));
});

// Get user data by ID
app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  knex
    .select("*")
    .from("users")
    .where({ id })
    .then(user => {
      user.length ? res.json(user[0]) : res.json("No such user");
    })
    .catch(error => res.status(404).json("Error. Unable to get user"));
});

//Update user data
app.put("/image", (req, res) => {
  const { id } = req.body;
  knex("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then(entries => {
      res.json(entries[0]);
    })
    .catch(error => res.status(404).json("Error. Unable to get count."));
});

const port = process.env.PORT || 3000;

app.listen(port, () =>
  console.log(`Server is running and listening on port ${port}!`)
);