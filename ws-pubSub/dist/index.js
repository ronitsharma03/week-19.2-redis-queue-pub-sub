"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = __importStar(require("ws"));
const redis_1 = require("redis");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const httpServer = app.listen(8080, function () {
    console.log("Server is listening on port 8080...");
});
// create a WS server
const wss = new ws_1.WebSocketServer({ server: httpServer });
const redisSubClient = (0, redis_1.createClient)(); // to subscribe the event
const userMap = new Map();
wss.on('connection', function (ws) {
    ws.on('error', console.error);
    let userId;
    console.log("New client connected");
    ws.on('message', function (message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = JSON.parse(message.toString());
                if (data.userId) {
                    userId = data.userId;
                    userMap.set(userId, ws);
                    console.log(`User registered with ${userId}`);
                }
                else {
                    console.log(`Invalid message format, Expected: {userId: 'some-id', }`);
                }
            }
            catch (error) {
                console.log("Error parsing message: ", error);
            }
        });
    });
    ws.on('close', function () {
        if (userId) {
            userMap.delete(userId);
            console.log(`Connection closed for ${userId} deleted`);
        }
    });
});
function connectClient() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisSubClient.connect();
            console.log("Connected to redis-client");
            // Subscribing to the event
            yield redisSubClient.subscribe('user-events', function (message) {
                try {
                    const event = JSON.parse(message);
                    const { userId, data } = event;
                    // checking is the user is connected to Ws server
                    if (userMap.has(userId)) {
                        const userSocket = userMap.get(userId);
                        if (!userSocket) {
                            console.log("No user connected found");
                            throw new Error("Error finding the user");
                        }
                        if (userSocket.readyState === ws_1.default.OPEN) {
                            userSocket.send(JSON.stringify({ channel: 'user-events', data }));
                            console.log(`Message sent to ${userId}`);
                        }
                    }
                }
                catch (error) {
                    console.log("Error subscribing to the user-event");
                }
            });
            console.log("Subscribed to the redis channel");
        }
        catch (error) {
            console.log("Error connecting to the redis-client");
        }
    });
}
connectClient();
