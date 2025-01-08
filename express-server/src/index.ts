import express, { Request, Response } from "express";
import { createClient } from "redis";

const app = express();
const client = createClient();

app.use(express.json());

app.post("/submit", async (req: Request, res: Response) => {
    const {problemId, userId, code, language} = req.body;
    // Also push the inputs to the database;

    try{
        await client.lPush("submissions", JSON.stringify({ code, language, problemId, userId }));
        // Store in the database
        res.status(200).send({
            message: "Submitted the code successfully!"
        });
    }catch(error){
        console.log("Error pushing the items to Queue");
        res.status(500).send({
            message: "Error submitting the code"
        });
    }
})


async function startServer(){
    try{
        await client.connect();
        console.log("Client connected!");

        app.listen(3000, () => {
            console.log("Server is running on port 3000...");
        });
    }catch(error){
        console.error("Failed to connect to Redis client ", error);
    }
}

startServer();

