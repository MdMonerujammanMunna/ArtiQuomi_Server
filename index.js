const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI;
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("I am alive");
});
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        await client.connect();
        const database = client.db("ArtiQuomi");
        const PromptsCollections = database.collection("Prompts");

        // For add Prompts api call
        app.post('/user/addPrompts', async (req, res) => {
            const prompts = req.body;
            const response = await PromptsCollections.insertOne(prompts);
            res.send(response);
        });
        // Get all Prompts api call
        app.get('/user/getPrompts', async (req, res) => {
            const response = await PromptsCollections.find({}).toArray();
            res.send(response);
        });


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});