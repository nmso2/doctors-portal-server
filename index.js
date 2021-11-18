const express = require('express')
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = require('./doctors-portal-nmso2-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sjr78.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// async function verifyToken(req, res, next) {
//     if (req.headers?.authorization?.startWith('Bearer ')) {
//         console.log('tut')
//         const token = req.headers?.authorization?.split(' ')[1];

//         try {
//             const decodedUser = await admin.auth().verifyIdToken(token);
//             req.decodedEmail = decodedUser.email;
//         }
//         catch {

//         }
//     }
//     next();
// }

async function run() {
    try {
        await client.connect();
        const database = client.db("doctorsPortal");
        const appointmentsCollection = database.collection("appointments");
        const usersCollection = database.collection("users");

        // POST API to add appointments
        app.post('/appointments', async (req, res) => {
            const appointments = req.body;
            const result = await appointmentsCollection.insertOne(appointments);
            res.json(result);
        });


        // POST API to add usera
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });


        // PUT API to update usera
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        // PUT API to make admin
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await userCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {

                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
                else {
                    res.status(403).json("You are not an admin!");
                }
            }
        });

        // // GET API (Get all appointments)
        // app.get('/appointments', async (req, res) => {
        //     const cursor = appointmentsCollection.find({});
        //     const appointments = await cursor.toArray();
        //     res.send(appointments);
        // });


        // GET API (Get appointments for single user with query)
        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date };
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            res.send(appointments);
        });

        //Get api for get product with id
        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointmentsCollection.findOne(query);
            res.json(result);
        });


        //Update payment information
        app.put('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await appointmentsCollection.updateOne(filter, updateDoc);
            res.json(result);
        })


        //Get API for admin check...
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            console.log(user);
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });

        //payment method(stripe)
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                payment_method_types: ["card"],
            });
            res.json({ clientSecret: paymentIntent.client_secret });
        })

    }
    finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Doctors Portal!')
})

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})