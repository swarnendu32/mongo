import {
    Db,
    ObjectId,
    WithId,
    Document,
    TransactionOptions,
    MongoError,
    MongoClient,
    ClientSession,
} from "mongodb";
import { client } from "./mongoDriver";

export async function isPostAvailable(
    postId: string,
    db: Db
): Promise<WithId<Document> | null> {
    const post = await db
        .collection("Posts")
        .findOne({ _id: new ObjectId(postId), deletedAt: { $exists: false } });
    return post;
}

export async function isBlocked(
    accountId: string,
    authorId: string,
    db: Db
): Promise<WithId<Document> | null> {
    const blocked = await db.collection("BlockedAccounts").findOne({
        $or: [
            { accountId: authorId, blockedBy: accountId },
            { accountId, blockedBy: authorId },
        ],
    });
    return blocked;
}

export async function privateFollowingStatus(
    authorId: string,
    accountId: string,
    db: Db
): Promise<WithId<Document> | null> {
    const author = await db.collection("Accounts").findOne({
        _id: new ObjectId(authorId),
    });
    if (author?.isPrivate) {
        const followed = await db.collection("FollowedAccounts").findOne({
            accountId: new ObjectId(authorId),
            followedBy: new ObjectId(accountId),
        });
        if (followed) {
            return author;
        } else {
            return null;
        }
    }
    return author;
}

export async function postViewStatus(
    postId: string,
    accountId: string,
    db: Db
): Promise<WithId<Document> | null> {
    const viewed = await db.collection("PostViews").findOne({
        postId: new ObjectId(postId),
        viewedBy: new ObjectId(accountId),
    });
    return viewed;
}

export async function executeTransaction(
    dbName: string,
    transactionFunction: (
        client: MongoClient,
        session: ClientSession,
        dbName: string,
        ...args: any[]
    ) => Promise<void>,
    maxRetries: number = 5,
    ...args: any[]
): Promise<void> {
    const transactionOptions = {
        readPreference: "primary",
        readConcern: "majority",
        writeConcern: { w: "majority" },
    } as TransactionOptions;
    await client.connect();
    const session = client.startSession();
    let retries = 0;
    while (true) {
        try {
            session.startTransaction(transactionOptions);
            await transactionFunction(client, session, dbName, ...args);
            await session.commitTransaction();
            break;
        } catch (error: any) {
            await session.abortTransaction();
            if (error instanceof MongoError) {
                if (
                    error.hasErrorLabel("TransientTransactionError") &&
                    retries <= maxRetries
                ) {
                    retries++;
                    console.log(
                        "Transaction aborted, retrying transient transaction error"
                    );
                } else if (
                    error.hasErrorLabel("UnknownTransactionCommitResult") &&
                    retries <= maxRetries
                ) {
                    retries++;
                    console.log(
                        "Transaction aborted, retrying unknown transaction commit result"
                    );
                }
            } else {
                throw error;
            }
        }
    }
    await session.endSession();
    await client.close();
}
