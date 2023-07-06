import { ObjectId, TransactionOptions } from "mongodb";
import { client } from "./mongoDriver";
import {
    Caption,
    Editables,
    Highlighted,
    Link,
    Location,
    Media,
} from "./types";
import {
    isBlocked,
    isPostAvailable,
    postViewStatus,
    privateFollowingStatus,
} from "./helperFunctions";

export async function postEdit(
    postId: string,
    accountId: string,
    items: Editables
) {
    await client.connect();
    const db = client.db("myDB");

    let postCount = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        createdby: new ObjectId(accountId),
        deletedAt: { $exists: false },
    });
    if (postCount !== 0) {
        if (items.location !== undefined) {
            let result1 = await db.collection("post").updateOne(
                {
                    _id: new ObjectId(postId),
                    createdBy: new ObjectId(accountId),
                    deletedAt: { $exists: false },
                },
                {
                    $set: {
                        taggedLocation: items.location,
                    },
                }
            );
            console.log(result1);

            let count = await db
                .collection("location")
                .countDocuments({ name: items.location });
        }
        if (items.caption !== undefined) {
            const hashTagList = await db
                .collection("post")
                .find({
                    _id: new ObjectId(postId),
                    createdBy: new ObjectId(accountId),
                    deletedAt: { $exists: false },
                })
                .project({ hashTags: "$caption.hashtags" })
                .toArray();
            let hashTags: string[] = [];
            if (hashTagList[0].hashTags !== undefined) {
                for (let i = 0; i < items.caption.hashTags.length; i++) {
                    let flag = 0;
                    for (let j = 0; j < hashTagList[0].hashTags.length; j++) {
                        if (
                            items.caption.hashTags[i] ===
                            hashTagList[0].hashTags[j]
                        ) {
                            flag = 1;
                            break;
                        }
                    }
                    if (flag === 0) {
                        hashTags.push(items.caption.hashTags[i]);
                    }
                }
            } else {
                hashTags = items.caption.hashTags;
            }
            for (let i = 0; i < hashTags.length; i++) {
                let hashTag = hashTags[i];
                let count = await db
                    .collection("hashtag")
                    .countDocuments({ name: hashTag });
                if (count === 0) {
                    let result = await db.collection("hashtag").insertOne({
                        _id: new ObjectId(),
                        name: hashTag,
                        createdAt: new Date(),
                        useCounts: {
                            post: 1,
                            memory: 0,
                            comment: 0,
                            bio: 0,
                            message: 0,
                        },
                        noOfVisits: 0,
                        noOfsearches: 0,
                    });
                    console.log(result);
                } else {
                    let result = await db.collection("hashtag").updateOne(
                        {
                            name: hashTag,
                        },
                        {
                            $inc: {
                                "useCounts.post": 1,
                            },
                        }
                    );
                    console.log(result);
                }
            }
        }
    }
}

export async function postLike(postId: string, accountId: string) {
    await client.connect();
    const session = client.startSession();
    const transactionOptions = {
        readPreference: "primary",
        readConcern: "local",
        writeConcern: { w: "majority" },
    } as TransactionOptions;
    try {
        await session.withTransaction(async () => {
            const db = client.db("myDB");
            // const post = await isPostAvailable(postId, db);
            // if (!post) {
            //     throw new Error("Post does not exist");
            // }
            // const authorId = post.createdBy;
            // const blocked = await isBlocked(accountId, authorId, db);
            // if (blocked) {
            //     throw new Error(
            //         "The author or the requesting account has been blocked"
            //     );
            // }
            // const author = await privateFollowingStatus(
            //     authorId,
            //     accountId,
            //     db
            // );
            // if (!author) {
            //     throw new Error(
            //         "The author account is private and the requesting account does not follow the author"
            //     );
            // }
            const viewed = await postViewStatus(postId, accountId, db);
            if (!viewed) {
                await db.collection("PostViews").insertOne({
                    _id: new ObjectId(),
                    postId: new ObjectId(postId),
                    viewedBy: new ObjectId(accountId),
                    viewedAt: new Date(),
                });

                let result = await db.collection("Posts").updateOne(
                    {
                        _id: new ObjectId(postId),
                        deletedAt: { $exists: true },
                    },
                    { $inc: { noOfViews: 1 } }
                );
                if(!result.modifiedCount){
                    throw new Error("Post does not exist");
                }
            }
            const liked = await db.collection("PostLikes").findOne({
                postId: new ObjectId(postId),
                likedBy: new ObjectId(accountId),
            });

            if (!liked) {
                await db.collection("PostLikes").insertOne({
                    _id: new ObjectId(),
                    postId: new ObjectId(postId),
                    likedBy: new ObjectId(accountId),
                    likedAt: new Date(),
                });

                let result = await db.collection("Posts").updateOne(
                    {
                        _id: new ObjectId(postId),
                        deletedAt: { $exists: false },
                    },
                    { $inc: { noOfLikes: 1 } }
                );
                if(!result.modifiedCount){
                    throw new Error("Post does not exist");
                }
            }
        }, transactionOptions);
    } catch (e: any) {
        console.log(e.message);
        // await session.abortTransaction();
    } finally {
        await session.endSession();
        await client.close();
    }
}

export async function postUnlike(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("postLikes").countDocuments({
        likedBy: new ObjectId(accountId),
        postId: new ObjectId(postId),
    });

    if (count === 1) {
        let result1 = await db.collection("post").updateOne(
            {
                _id: new ObjectId(postId),
                deletedAt: { $exists: false },
            },
            { $inc: { noOfLikes: -1 } }
        );
        console.log(result1);

        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("postLikes").deleteOne({
                likedBy: new ObjectId(accountId),
                postId: new ObjectId(postId),
            });
            console.log(result2);
        }
    }

    await client.close();
}

export async function postSave(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("postSaves").countDocuments({
        postId: new ObjectId(postId),
        savedBy: new ObjectId(accountId),
    });
    if (count === 0) {
        let result1 = await db
            .collection("post")
            .updateOne(
                { _id: new ObjectId(postId), deletedAt: { $exists: false } },
                { $inc: { noOfSaves: 1 } }
            );
        console.log(result1);

        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("postSaves").insertOne({
                _id: new ObjectId(),
                postId: new ObjectId(postId),
                savedBy: new ObjectId(accountId),
                savedAt: new Date(),
            });
            console.log(result2);
        }
    }

    await client.close();
}

export async function postUnsave(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("postSaves").countDocuments({
        postId: new ObjectId(postId),
        savedBy: new ObjectId(accountId),
    });
    if (count === 1) {
        let result1 = await db
            .collection("post")
            .updateOne(
                { _id: new ObjectId(postId), deletedAt: { $exists: false } },
                { $inc: { noOfSaves: -1 } }
            );
        console.log(result1);
        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("postSaves").deleteOne({
                postId: new ObjectId(postId),
                savedBy: new ObjectId(accountId),
            });
            console.log(result2);
        }
    }

    await client.close();
}

export async function postView(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("postViews").countDocuments({
        postId: new ObjectId(postId),
        viewedBy: new ObjectId(accountId),
    });

    if (count === 0) {
        let result1 = await db
            .collection("post")
            .updateOne(
                { _id: new ObjectId(postId), deletedAt: { $exists: false } },
                { $inc: { noOfViews: 1 } }
            );
        console.log(result1);

        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("postViews").insertOne({
                _id: new ObjectId(),
                postId: new ObjectId(postId),
                viewedBy: new ObjectId(accountId),
                viewedAt: Date.now(),
            });
            console.log(result2);
        }
    }

    await client.close();
}

export async function postShare(
    postId: string,
    senderAccountId: string,
    receiverAccountId: string[]
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    for (let i = 0; i < receiverAccountId.length; i++) {
        let result1 = await db.collection("post").updateOne(
            { _id: new ObjectId(postId), deletedAt: { $exists: false } },
            {
                $inc: { noOfShares: 1 },
            }
        );
        console.log(result1);
        if (result1.modifiedCount === 0) {
            break;
        }

        let result2 = await db.collection("message").insertOne({
            _id: new ObjectId(),
            createdBy: new ObjectId(senderAccountId),
            createdAt: new Date(),
            chatId: new ObjectId(receiverAccountId[i]),
            attachment: {
                type: "post",
                postId: new ObjectId(postId),
            },
        });
        console.log(result2);
    }

    await client.close();
}

export async function postCirculation(
    postId: string,
    accountId: string,
    options: boolean,
    content: Media,
    caption: Caption,
    afterEffect: string,
    audioUrl?: string,
    location?: Location,
    link?: Link,
    savedTo?: Highlighted[],
    cameraTool?: "boomerang" | "layout"
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("myDB").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableMemoryCirculation": false,
    });

    if (count !== 0) {
        let result = await db.collection("memory").insertOne({
            _id: new ObjectId(),
            createdAt: new Date(),
            createdBy: new ObjectId(accountId),
            content: content,
            caption: caption,
            usedAudio: audioUrl,
            usedAfterEffect: afterEffect,

            location:
                location === undefined
                    ? undefined
                    : {
                          name: location,
                          color: location.color,
                          presentationStyle: location.presentationStyle,
                          zIndex: location.zIndex,
                          scale: location.scale,
                          rotation: location.rotation,
                          translation: location.translation,
                      },
            link:
                link === undefined
                    ? undefined
                    : {
                          url: link.url,
                          title: link.title,
                          color: link.color,
                          presentationStyle: link.presentationStyle,
                          zIndex: link.zIndex,
                          scale: link.scale,
                          rotation: link.rotation,
                          translation: link.translation,
                      },
            noOfViews: 0,
            noOfLikes: 0,
            noOfReplies: 0,
            noOfShares: 0,
            noOfCirculations: 0,
            addedTo: savedTo === undefined ? undefined : [...savedTo],
            userCameraTool: cameraTool,
            advancedOptions: {
                disableReply: options,
            },
        });
        console.log(result);
    }
    await client.close();
}

export async function postPin(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let result = await db.collection("post").updateOne(
        {
            _id: new ObjectId(postId),
            createdBy: new ObjectId(accountId),
            deletedAt: { $exists: false },
            isPinned: false,
        },
        {
            $set: {
                isPinned: true,
            },
        }
    );
    console.log(result);
    await client.close();
}

export async function postUnpin(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let result = await db.collection("post").updateOne(
        {
            _id: new ObjectId(postId),
            createdBy: new ObjectId(accountId),
            deletedAt: { $exists: false },
            isPinned: true,
        },
        {
            $set: {
                isPinned: false,
            },
        }
    );
    console.log(result);
    await client.close();
}

export async function postDelete(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let result = await db.collection("post").updateOne(
        {
            _id: new ObjectId(postId),
            createdBy: new ObjectId(accountId),
            deletedAt: { $exists: false },
        },
        {
            $set: {
                deletedAt: new Date(),
            },
        }
    );
    console.log(result);
    await client.close();
}

export async function postRestore(postId: string, accountId: string) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let result = await db.collection("post").updateOne(
        {
            _id: new ObjectId(postId),
            createdBy: new ObjectId(accountId),
            deletedAt: { $exists: true },
        },
        {
            $unset: {
                deletedAt: 0,
            },
        }
    );
    console.log(result);
    await client.close();
}

export async function postComment(
    postId: string,
    accountId: string,
    comment: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });

    if (count !== 0) {
        let result1 = await db.collection("post").updateOne(
            {
                _id: new ObjectId(postId),
                deletedAt: { $exists: false },
                "advancedOptions.disableComment": false,
            },
            {
                $inc: {
                    noOfComments: 1,
                },
            }
        );
        console.log(result1);
        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("comment").insertOne({
                _id: new ObjectId(),
                isPinned: false,
                postId: new ObjectId(postId),
                createdBy: new ObjectId(accountId),
                createdAt: new Date(),
                text: comment,
                noOfReplies: 0,
                noOfLikes: 0,
            });
            console.log(result2);
        }
    }
    await client.close();
}

export async function postCommentLike(
    postId: string,
    commentId: string,
    accountId: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });
    if (count !== 0) {
        let result1 = await db
            .collection("comment")
            .updateOne(
                { _id: new ObjectId(commentId), deletedAt: { $exists: false } },
                { $inc: { noOfLikes: 1 } }
            );
        console.log(result1);
        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("commentLike").insertOne({
                _id: new ObjectId(),
                commentId: new ObjectId(commentId),
                likedBy: new ObjectId(accountId),
                likedAt: new Date(),
            });
            console.log(result2);
        }
    }
    await client.close();
}

export async function postCommentUnlike(
    postId: string,
    commentId: string,
    accountId: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });
    if (count !== 0) {
        let result1 = await db
            .collection("comment")
            .updateOne(
                { _id: new ObjectId(commentId), deletedAt: { $exists: false } },
                { $inc: { noOfLikes: -1 } }
            );
        console.log(result1);
        if (result1.modifiedCount !== 0) {
            let result2 = await db.collection("commentLike").deleteOne({
                commentId: new ObjectId(commentId),
                likedBy: new ObjectId(accountId),
            });
            console.log(result2);
        }
    }
    await client.close();
}

export async function postCommentPin(
    postId: string,
    commentId: string,
    accountId: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        createdBy: new ObjectId(accountId),
        deletedAt: { $exists: false },
    });
    if (count !== 0) {
        let result = await db.collection("comment").updateOne(
            {
                _id: new ObjectId(commentId),
                deletedAt: { $exists: false },
                isPinned: false,
            },
            { $set: { isPinned: true } }
        );
        console.log(result);
    }
    await client.close();
}

export async function postCommentUnpin(
    postId: string,
    commentId: string,
    accountId: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        createdBy: new ObjectId(accountId),
        deletedAt: { $exists: false },
    });
    if (count !== 0) {
        let result = await db.collection("comment").updateOne(
            {
                _id: new ObjectId(commentId),
                deletedAt: { $exists: false },
                isPinned: true,
            },
            { $set: { isPinned: false } }
        );
        console.log(result);
    }
    await client.close();
}

export async function postCommentDelete(
    postId: string,
    commentId: string,
    accountId: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComments": false,
    });
    if (count !== 0) {
        let count1 = await db.collection("post").countDocuments({
            _id: new ObjectId(postId),
            deletedAt: { $exists: false },
            createdBy: new ObjectId(accountId),
        });
        let count2 = await db.collection("comment").countDocuments({
            _id: new ObjectId(commentId),
            createdBy: new ObjectId(accountId),
        });

        if (count1 !== 0 || count2 !== 0) {
            let result = await db.collection("comment").updateOne(
                {
                    _id: new ObjectId(commentId),
                    deletedAt: { $exists: false },
                },
                {
                    $set: {
                        deletedAt: new Date(),
                    },
                }
            );
            console.log(result);
        }
    }
    await client.close();
}

export async function postCommentEdit(
    postId: string,
    commentId: string,
    accountId: string,
    comment: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });
    if (count !== 0) {
        let result = await db.collection("comment").updateOne(
            {
                _id: new ObjectId(commentId),
                deletedAt: { $exists: false },
                createdBy: new ObjectId(accountId),
            },
            { $set: { text: comment, updatedAt: new Date() } }
        );
        console.log(result);
    }
    await client.close();
}

export async function postCommentReply(
    postId: string,
    accountId: string,
    commentId: string,
    content: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });
    if (count !== 0) {
        let count1 = await db.collection("comment").countDocuments({
            _id: new ObjectId(commentId),
            deletedAt: { $exists: false },
        });
        if (count1 !== 0) {
            let result = await db.collection("comment").insertOne({
                _id: new ObjectId(),
                isPinned: false,
                postId: new ObjectId(postId),
                createdBy: new ObjectId(accountId),
                createdAt: new Date(),
                text: content,
                repliedTo: new ObjectId(commentId),
                noOfReplies: 0,
                noOfLikes: 0,
            });
        }
    }
    await client.close();
}

export async function postCommentReplyLike(
    postId: string,
    commentId: string,
    replyId: string,
    accountId: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });
    if (count !== 0) {
        let count1 = await db.collection("comment").countDocuments({
            _id: new ObjectId(commentId),
            deletedAt: { $exists: false },
        });
        if (count1 !== 0) {
            let result1 = await db.collection("comment").updateOne(
                {
                    _id: new ObjectId(replyId),
                    deletedAt: { $exists: false },
                },
                {
                    $inc: { noOfLikes: 1 },
                }
            );
            console.log(result1);

            let result2 = await db.collection("commentLike").insertOne({
                _id: new ObjectId(),
                commentId: new ObjectId(replyId),
                likedBy: new ObjectId(accountId),
                createdAt: new Date(),
            });
            console.log(result2);
        }
    }
    await client.close();
}

export async function postCommentReplyEdit(
    postId: string,
    commentId: string,
    replyId: string,
    accountId: string,
    content: string
) {
    await client.connect();
    const db = client.db("myDB");
    // Check if the author's account is a private, if private check whether the requesting account follows the author,
    // also check whether requesting account is blocked by the user

    let count = await db.collection("post").countDocuments({
        _id: new ObjectId(postId),
        deletedAt: { $exists: false },
        "advancedOptions.disableComment": false,
    });
    if (count !== 0) {
        let count1 = await db.collection("comment").countDocuments({
            _id: new ObjectId(commentId),
            deletedAt: { $exists: false },
        });
        if (count1 !== 0) {
            let result = await db.collection("comment").updateOne(
                {
                    _id: new ObjectId(replyId),
                    createdBy: new ObjectId(accountId),
                    deletedAt: { $exists: false },
                },
                {
                    $set: { text: content, updatedAt: new Date() },
                }
            );
            console.log(result);
        }
    }
    await client.close();
}
