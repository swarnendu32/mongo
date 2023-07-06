import { ObjectId } from "mongodb";
import {
    postComment,
    postCommentDelete,
    postCommentEdit,
    postCommentLike,
    postCommentPin,
    postCommentUnlike,
    postCommentUnpin,
    postDelete,
    postLike,
    postPin,
    postRestore,
    postSave,
    postShare,
    postUnlike,
    postUnpin,
    postUnsave,
    postView,
} from "./postQueries";

postLike("64a3c6d2624442c062d11650", new ObjectId().toString())

// postUnlike("64919cf6ad0f7e91207d6ee4", "64919e953aed555fbf0065bf")

// postSave("64919cf6ad0f7e91207d6ee4", new ObjectId().toString());

// postUnsave("64919cf6ad0f7e91207d6ee4", "6491a7cd3b7dd4c0dd934e74");

// postView("64919cf6ad0f7e91207d6ee4", new ObjectId().toString());

// postShare("64919cf6ad0f7e91207d6ee4", new ObjectId().toString(), [
//     new ObjectId().toString(),
//     new ObjectId().toString(),
//     new ObjectId().toString(),
//     new ObjectId().toString(),
// ]);

// postPin("64919cf6ad0f7e91207d6ee4", "64919cf6ad0f7e91207d6ee5")

// postUnpin("64919cf6ad0f7e91207d6ee4", "64919cf6ad0f7e91207d6ee5")

// postDelete("64919cf6ad0f7e91207d6ee4", "64919cf6ad0f7e91207d6ee5")

// postRestore("64919cf6ad0f7e91207d6ee4", "64919cf6ad0f7e91207d6ee5")

// postComment("64919cf6ad0f7e91207d6ee4", new ObjectId().toString(), "Hello World!!!")

// postCommentLike(
//     "64919cf6ad0f7e91207d6ee4",
//     "64945a3d0cd5c29c2d38b129",
//     new ObjectId().toString()
// );

// postCommentUnlike("64919cf6ad0f7e91207d6ee4", "64945a3d0cd5c29c2d38b129", "64947457984001148a09c205")

// postCommentPin("64919cf6ad0f7e91207d6ee4", "64945a3d0cd5c29c2d38b129", "64919cf6ad0f7e91207d6ee5")

// postCommentUnpin("64919cf6ad0f7e91207d6ee4", "64945a3d0cd5c29c2d38b129", "64919cf6ad0f7e91207d6ee5")

// postCommentDelete("64919cf6ad0f7e91207d6ee4", "64945a3d0cd5c29c2d38b129", "64919cf6ad0f7e91207d6ee5")

// postCommentEdit("64919cf6ad0f7e91207d6ee4", "64945a3d0cd5c29c2d38b129", "64945a3a0cd5c29c2d38b128", "This comment has been updated.")