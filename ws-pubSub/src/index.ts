import express from 'express';
import webSocket, { WebSocketServer } from 'ws';
import { createClient } from 'redis';


const app = express();
app.use(express.json());
const httpServer = app.listen(8080, function(){
    console.log("Server is listening on port 8080...")
});

// create a WS server
const wss = new WebSocketServer({ server: httpServer });
const redisSubClient = createClient(); // to subscribe the event
const userMap = new Map();

wss.on('connection', function(ws){
    ws.on('error', console.error);
    
    let userId: string;

    console.log("New client connected");
    ws.on('message', async function(message: webSocket.RawData){
        try{
            const data = JSON.parse(message.toString());
            if(data.userId){
                userId = data.userId;
                userMap.set(userId, ws);
                console.log(`User registered with ${userId}`)
            }else{
                console.log(`Invalid message format, Expected: {userId: 'some-id', }`)
            }
        }catch(error){
            console.log("Error parsing message: ", error);
        }
    });

    ws.on('close', function(){
        if(userId){
            userMap.delete(userId)
            console.log(`Connection closed for ${userId} deleted`);
        }
    })
});

async function connectClient(){
    try{
        await redisSubClient.connect();
        console.log("Connected to redis-client");

        // Subscribing to the event
        await redisSubClient.subscribe('user-events', function(message){
            try{
                const event = JSON.parse(message);
                const { userId, data } = event;

                // checking is the user is connected to Ws server
                if(userMap.has(userId)){
                    const userSocket = userMap.get(userId);
                    if(!userSocket){
                        console.log("No user connected found");
                        throw new Error("Error finding the user");
                    }
                    if(userSocket.readyState === webSocket.OPEN){
                        userSocket.send(JSON.stringify({ channel: 'user-events', data }));
                        console.log(`Message sent to ${userId}`);
                    }
                }
            }catch(error){
                console.log("Error subscribing to the user-event");
            }

        })
        console.log("Subscribed to the redis channel");

    }catch(error){
        console.log("Error connecting to the redis-client");
    }
}

connectClient();
