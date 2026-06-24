const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { jwtVerify, createRemoteJWKSet } = require("jose-cjs");
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


const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

// JWT verification
const VrifyJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = { payload };
        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ message: "Invalid token" });
    }
    const UserVarify = async (req, res, next) => {
        const user = req?.user;
        console.log(user)
        if (user.role !== "User") {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    }

    // Creator role
    const CreatorVarify = async (req, res, next) => {
        const user = req.user;
        if (user.role !== "Creator") {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    }

    // Admin role
    const AdminVarify = async (req, res, next) => {
        const user = req?.user;
        console.log(user)
        if (user.role !== "Admin") {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    }
}
async function run() {
    try {
        await client.connect();
        const database = client.db("ArtiQuomi");
        const PromptsCollections = database.collection("Prompts");
        const ReviewsCollections = database.collection("Reviews");
        const BookMarksCollections = database.collection("BookMarks");
        const PaymentsCollections = database.collection("Payments");
        const ReportsCollections = database.collection("Reports");
        const UserCollections = database.collection("user");

        // Creator Promes testiong
        app.post("/stats", async (req, res) => {
            const { userId } = req.body;
            // console.log(userId);
            const result = await PromptsCollections.aggregate([
                {
                    $match: {
                        UserId: userId
                    }
                },

                {
                    $group: {
                        _id: null,
                        copyCount: { $sum: "$copyCount" },
                        bookmarkCount: { $sum: "$bookmarkCount" }
                    }
                }
            ]).toArray();

            res.send(result[0] || { copyCount: 0, bookmarkCount: 0 });
        });
        app.get("/stats/Admin", async (req, res) => {
            const [prompts, promptsTotal, reviews] = await Promise.all([
                PromptsCollections.aggregate([
                    {
                        $group: {
                            _id: null,
                            copyCount: { $sum: "$copyCount" },
                        },
                    },
                ]).toArray(),

                PromptsCollections.countDocuments({
                    status: "Approved"
                }),
                ReviewsCollections.countDocuments(),
            ]);

            res.send({
                copyCount: prompts[0]?.copyCount || 0,
                totalReviews: reviews,
                totalPrompts: promptsTotal,
            });
        });
        // Get 6 Prompts api for show home page
        app.get('/user/heroPrompts', async (req, res) => {
            const response = await PromptsCollections.find({ status: "Approved" }).limit(6).toArray();
            res.send(response);
        })
        // For add Prompts api call
        app.post('/user/addPrompts', VrifyJWT, async (req, res) => {
            const prompts = req.body;
            const response = await PromptsCollections.insertOne(prompts);
            res.send(response);
        });
        // For add Prompts api call Creator
        app.post('/creator/addPrompts', VrifyJWT, async (req, res) => {
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
                const userId = req.params.id;

                const save = await BookMarksCollections.find({
                    userId: userId,
                }).toArray();

                return res.send(save);

            } catch (error) {
                console.log(error);
                return res.status(500).send({
                    message: "Internal Server Error",
                });
            }
        });


        // Save your book mark api call
        app.post("/user/saveBookMark", VrifyJWT, async (req, res) => {
            const bookMark = req.body;

            const exists = await BookMarksCollections.findOne({
                promptId: bookMark.promptId,
                userId: bookMark.userId,
            });

            if (exists) {
                return res.status(400).send({
                    message: "Prompt already saved."
                });
            }

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
        app.delete("/prompts/Delect", VrifyJWT, async (req, res) => {
            const prompts = req.body;
            const { id } = prompts;
            const query = { _id: new ObjectId(id) };
            const response = await PromptsCollections.deleteOne(query);
            res.send(response);
            // console.log(response);
        })


        // update prompts api call
        app.patch("/api/prompts", async (req, res) => {
            const prompts = req.body;
            const { id } = prompts;
            const query = { _id: new ObjectId(id) };
            const response = await PromptsCollections.updateOne(query, { $set: prompts });
            res.send(response);
        })

        // Save your book mark remove api call
        app.delete("/user/deleteSaveBookMark", VrifyJWT, async (req, res) => {
            const bookMark = req.body;
            const { id } = bookMark;
            const query = { promptId: id };
            // console.log(query);
            const response = await BookMarksCollections.deleteOne(query);
            res.send(response);
            // console.log(response);
        })

        // Reviews delete api call
        app.delete("/user/deleteReview", async (req, res) => {
            const review = req.body;
            const { id } = review;
            const query = { _id: new ObjectId(id) };
            // console.log(query);
            const response = await ReviewsCollections.deleteOne(query);
            res.send(response);
            // console.log(response);
        })

        // Get all payments api call
        app.post('/user/getPayments', async (req, res) => {
            const { session_id, customer_id, customer_email } = req.body;
            const response = await PaymentsCollections.findOne({ session_id });
            if (response) {
                return res.status(400).send({
                    message: "Payment already exist",
                });
            }
            const paymentsUser = await PaymentsCollections.insertOne({
                session_id,
                customer_id,
                customer_email,
            })
            // update user role
            await UserCollections.updateOne({ _id: new ObjectId(customer_id) }, { $set: { plan: "pro" } });
            res.json({ messages: "payments success" });
        });


        // copy count api call
        app.patch("/user/copyCount/:id", async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const response = await PromptsCollections.updateOne(query, { $inc: { copyCount: 1 } });
            res.send(response);
        })

        //    update save count
        app.patch("/user/saveCount/:id", async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const response = await PromptsCollections.updateOne(query, { $inc: { bookmarkCount: 1 } });
            res.send(response);
        })
        // Report prompts api call VrifyJWT,
        app.post("/user/reportPrompts", async (req, res) => {
            const prompts = req.body;
            const response = await ReportsCollections.insertOne(prompts);
            res.send(response);
        });

        // Delect prompts form database
        app.delete("/Admin/DelectDatbase", async (req, res) => {
            const prompts = req.body;
            const { id } = prompts;
            const query = { _id: new ObjectId(id) };
            // console.log(query)
            const response = await PromptsCollections.deleteOne(query);
            res.send(response);
            // console.log(response);
        })
        // Update Prompt Admin
        app.patch("/Admin/UpdatePrompt", async (req, res) => {
            // console.log(req.body)
            const { srcId, status } = req.body;
            // console.log(status)
            const query = { _id: new ObjectId(srcId) };
            const update = {
                $set: {
                    status,
                },
            };

            const response = await PromptsCollections.updateOne(query, update);

            res.send(response);
        });

        // get user payment
        app.get("/user/getPayments", async (req, res) => {
            const response = await PaymentsCollections.find().toArray()
            res.send(response)
        })
        // Delete payments
        app.delete("/Admin/DelectePaymet", async (req, res) => {
            const { id } = req.body;
            const query = { session_id: (id) };
            // console.log(query);
            const response = await PaymentsCollections.deleteOne(query);
            res.send(response);
        })

        // Get all Prompts api call
        app.get('/Admin/getAllUsers', async (req, res) => {
            const response = await UserCollections.find({}).toArray();
            res.send(response);
        });
        // Delete User
        app.delete("/Admin/DeleteUser", async (req, res) => {
            const { id } = req.body;
            const query = { _id: new ObjectId(id) };
            // console.log(query);
            const response = await UserCollections.deleteOne(query);
            res.send(response);
        })
        // Update user role
        app.patch("/Admin/UpdateUser", async (req, res) => {
            const { id, role } = req.body;
            const query = { _id: new ObjectId(id) };
            const update = {
                $set: {
                    role,
                },
            };
            const response = await UserCollections.updateOne(query, update);
            res.send(response);
        })

        // Get all reports
        app.get("/user/getReports", async (req, res) => {
            const response = await ReportsCollections.find({}).toArray();
            res.send(response);
            // console.log(response);
        });
        // Delete repots on id:-
        app.delete("/Admin/deletedReports", async (req, res) => {
            const { id } = req.body;
            // console.log(id);
            const query = { _id: new ObjectId(id) };
            const response = await ReportsCollections.deleteOne(query);
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