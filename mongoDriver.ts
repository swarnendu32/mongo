import { readFileSync } from "fs";
import { MongoClient, MongoClientOptions } from "mongodb";
import path from "path";
import { createSecureContext } from "tls";

const url = "mongodb+srv://cluster0.ssap4qe.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority";

const secureContext = createSecureContext({
    cert: readFileSync(
        path.join(__dirname, "./X509_cert_3289345913187973920.pem")
    ),
    key: readFileSync(
        path.join(__dirname, "./X509_cert_3289345913187973920.pem")
    ),
});

const options = {tls: true, secureContext: secureContext} as MongoClientOptions

export const client = new MongoClient(url, options);