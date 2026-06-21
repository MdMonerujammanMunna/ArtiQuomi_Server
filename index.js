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
        const ReviewsCollections = database.collection("Reviews");
        const BookMarksCollections = database.collection("BookMarks");

        // Get 6 Prompts api for show home page
        app.get('/user/heroPrompts', async (req, res) => {
            const response = await PromptsCollections.find({}).limit(6).toArray();
            res.send(response);
        })
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


        // Review  section post api call
        app.post('/user/addReview', async (req, res) => {
            const review = req.body;
            const response = await ReviewsCollections.insertOne(review);
            res.send(response);
        });

        // get all reviews by user id
        app.get("/user/getReviewsByPathId/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid Review ID",
                    });
                }

                const review = await ReviewsCollections.find({
                    PathId: id,
                }).toArray();

                if (!review) {
                    return res.status(404).send({
                        message: "Review not found",
                    });
                }

                res.send(review);
            } catch (error) {
                console.log(error);
                res.status(500).send({
                    message: "Internal Server Error",
                });
            }
        });

        // Get your created prompts
        app.get("/user/getUserPrompts/:id", async (req, res) => {
            try {
                const { id } = req.params;
                // console.log(id);
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid User ID",
                    });
                }

                const prompt = await PromptsCollections.find({
                    UserId: id,
                }).toArray();

                if (!prompt) {
                    return res.status(404).send({
                        message: "User not found",
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
        // Get your created reviews
        app.get("/user/getUserReviews/:id", async (req, res) => {
            try {
                const { id } = req.params;
                // console.log(id);
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid User ID",
                    });
                }

                const review = await ReviewsCollections.find({
                    id: id,
                }).toArray();

                if (!review) {
                    return res.status(404).send({
                        message: "User not found",
                    });
                }

                res.send(review);
                // console.log(prompt);
            } catch (error) {
                console.log(error);
                res.status(500).send({
                    message: "Internal Server Error",
                });
            }
        });
        // Get your Saved book marks
        app.get("/user/getUserSavePrompts/:id", async (req, res) => {
            try {
                const { id } = req.params;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid User ID",
                    });
                }

                const Save = await BookMarksCollections.find({
                    saveBy: id,
                }).toArray();

                if (!Save) {
                    return res.status(404).send({
                        message: "User not found",
                    });
                }

                res.send(Save);
            } catch (error) {
                console.log(error);
                res.status(500).send({
                    message: "Internal Server Error",
                });
            }
        });


        // Save your book mark api call
        app.post("/user/saveBookMark", async (req, res) => {
            const bookMark = req.body;
            const response = await BookMarksCollections.insertOne(bookMark);
            res.send(response);
        });

        // all reviews get for home page
        app.get("/user/getAllReviews", async (req, res) => {
            try {
                const response = await ReviewsCollections.find({}).limit(3).toArray();
                res.send(response);
            } catch (error) {
                console.log(error);
                res.status(500).send({
                    message: "Internal Server Error",
                });
            }
        });

        // Delect prompts form database
        app.delete("/prompts/Delect", async (req, res) => {
            const prompts = req.body;
            const { id } = prompts;
            const query = { _id: new ObjectId(id) };
            const response = await PromptsCollections.deleteOne(query);
            res.send(response);
            console.log(response);
        })


        // update prompts api call
        app.patch("/api/prompts", async (req, res) => {
            const prompts = req.body;
            const { id } = prompts;
            const query = { _id: new ObjectId(id) };
            const response = await PromptsCollections.updateOne(query, { $set: prompts });
            res.send(response);
        })

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