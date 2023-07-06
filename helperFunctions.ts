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

/**
 * Check if a post is available in the database.
 * @async
 * @function isPostAvailable
 * @param {string} postId - The ID of the post to check.
 * @param {Db} db - The database instance to use.
 * @returns {Promise<WithId<Document> | null>} Returns the post document if it exists and is not deleted, otherwise returns null.
 */

export async function isPostAvailable(
    postId: string,
    db: Db
): Promise<WithId<Document> | null> {
    const post = await db
        .collection("Posts")
        .findOne({ _id: new ObjectId(postId), deletedAt: { $exists: false } });
    return post;
}

/**
 * Check if an account is blocked by another account.
 * @async
 * @function isBlocked
 * @param {string} accountId - The ID of the account to check.
 * @param {string} authorId - The ID of the author to check against.
 * @param {Db} db - The database instance to use.
 * @returns {Promise<WithId<Document> | null>} Returns the blocked document if it exists, otherwise returns null.
 */

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

/**
 * Check if an account is private and if the author is followed by the account.
 * @async
 * @function privateFollowingStatus
 * @param {string} authorId - The ID of the author to check.
 * @param {string} accountId - The ID of the account to check.
 * @param {Db} db - The database instance to use.
 * @returns {Promise<WithId<Document> | null>} Returns the author document if it exists and is not private or if it is private and followed by the account, otherwise returns null.
 */

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

/**
 * Check if a post has been viewed by an account.
 * @async
 * @function postViewStatus
 * @param {string} postId - The ID of the post to check.
 * @param {string} accountId - The ID of the account to check.
 * @param {Db} db - The database instance to use.
 * @returns {Promise<WithId<Document> | null>} Returns the viewed document if it exists, otherwise returns null.
 */

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

/**
 * Execute a transaction with retries on transient errors or unknown commit results.
 * @async
 * @function executeTransaction
 * @param {string} dbName - The name of the database to use.
 * @param {Function} transactionFunction - The function to execute in the transaction.
 * @param {number} [maxRetries=5] - The maximum number of retries on transient errors or unknown commit results.
 * @param {...any[]} args - Additional arguments to pass to the transaction function.
 */

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
