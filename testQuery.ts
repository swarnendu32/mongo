import { ClientSession, MongoClient, ObjectId } from "mongodb";
import { client } from "./mongoDriver";
import {
    executeTransaction,
    isPostAvailable,
    postViewStatus,
} from "./helperFunctions";
import { getAllJSDocTagsOfKind } from "typescript";

async function zipcodes(
    client: MongoClient,
    session: ClientSession,
    dbName: string,
    postId: string,
    accountId: string
) {
    const db = client.db(dbName);
    const post = await isPostAvailable(postId, db);
    if (!post) {
        throw new Error("Post does not exist");
    }
    const viewed = await postViewStatus(postId, accountId, db);
    if (!viewed) {
        await db.collection("PostViews").insertOne(
            {
                _id: new ObjectId(),
                postId: new ObjectId(postId),
                viewedBy: new ObjectId(accountId),
                viewedAt: new Date(),
            },
            { session }
        );

        let result = await db.collection("Posts").updateOne(
            {
                _id: new ObjectId(postId),
                deletedAt: { $exists: false },
            },
            { $inc: { noOfViews: 1 } },
            { session }
        );
        if (!result.modifiedCount) {
            throw new Error("Post does not exist");
        }
    }
    const liked = await db.collection("PostLikes").findOne(
        {
            postId: new ObjectId(postId),
            likedBy: new ObjectId(accountId),
        },
        { session }
    );

    if (!liked) {
        await db.collection("PostLikes").insertOne(
            {
                _id: new ObjectId(),
                postId: new ObjectId(postId),
                likedBy: new ObjectId(accountId),
                likedAt: new Date(),
            },
            { session }
        );

        let result = await db.collection("Posts").updateOne(
            {
                _id: new ObjectId(postId),
                deletedAt: { $exists: false },
            },
            { $inc: { noOfLikes: 1 } },
            { session }
        );
        console.log(result);
        if (!result.modifiedCount) {
            throw new Error("Post does not exist");
        }
    }
}

executeTransaction(
    "myDB",
    zipcodes,
    undefined,
    "64a3c6d2624442c062d11650",
    new ObjectId().toString(),
);
