import { readFileSync } from "fs";
import { MongoClient, MongoClientOptions, ServerApiVersion } from "mongodb";
import path from "path";
import { createSecureContext } from "tls";

// const url = "mongodb://localhost:27017";
const url = "mongodb+srv://cluster0.ssap4qe.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority";
// const url ="mongodb+srv://swarnendu123:Swarnendu_1998@cluster0.ssap4qe.mongodb.net/?retryWrites=true&w=majority";
// const url = "mongodb+srv://subhamroy199906:tA4fnsuh6NmdLcio@test-cluster-1.g7jcj9i.mongodb.net/test"
// const url ="mongodb+srv://swarnendubabai32:Swarnendu_32@cluster0.ssap4qe.mongodb.net/?retryWrites=true&w=majority"
// const url = "mongodb+srv://subhamroy199906:tA4fnsuh6NmdLcio@test-cluster-1.g7jcj9i.mongodb.net/?retryWrites=true&w=majority"

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