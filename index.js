const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        // get all prompts by user id
        app.get("/user/getPromptsByUserId/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid Prompt ID",
                    });
                }

                const prompt = await PromptsCollections.findOne({
                    _id: new ObjectId(id),
                });

                if (!prompt) {
                    return res.status(404).send({
                        message: "Prompt not found",
                    });
                }

                res.send(prompt);
                // console.log(prompt);
            } catch (error) {
                console.log(error);
                res.status(500).send({
                    message: "Internal Server Error",
                });
            }
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