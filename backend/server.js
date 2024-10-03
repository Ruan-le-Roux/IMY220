import express from "express";

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

// const port = process.env.PORT || 3005;
const port = process.env.PORT || 3000;


// const port = process.env.PORT || 3005;

// const port =  3001;

//create app
const app = express();

//serve static page into public directory
app.use(express.static("frontend/public"));

app.use(express.json());


const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDatabase() 
{
    try
    {
        await client.connect();
        db = client.db("SoundSync");

        console.log("Connected to MongoDB");
    }
    catch(error)
    {
        console.error("Failed to connect to MongoDB", error);
    }
}

connectDatabase();

app.listen(port, () => {
    console.log(`Listening on port: localhost:${port}`);
});

//functions
//generate user id
async function generateId()
{
    const users = await db.collection("users").find({}).toArray();
    if(users.length === 0)
    {
        return 1;
    }

    const maxId = Math.max(...users.map(user => user.id));
    return maxId + 1;
}

async function generatePlaylistId()
{
    const playlists = await db.collection("playlists").find({}).toArray();
    if(playlists.length === 0)
    {
        return 1;
    }

    const maxId = Math.max(...playlists.map(playlist => playlist.id));
    return maxId + 1;
}

async function generateCommentId(id)
{
    const playlist = await db.collection("playlists").findOne({id: parseInt(id)});

    let count = playlist.comments ? playlist.comments.length : 0;
    if(count === 0)
    {
        return 1;
    }
    else
    {
        let existingCommentIds = playlist.comments.map(comment => comment.id);
        let maxId = Math.max(...existingCommentIds);
        maxId ++;
        return maxId;
    }
}

async function existingUser(flag, delimiter)
{
    if(flag === true)
    {
        const existingUser = await db.collection("users").findOne({email: delimiter});
        if(existingUser)
        {
            return true;
        }
        return false;
    }
    else
    {
        const existingUser = await db.collection("users").findOne({id: parseInt(delimiter)});
        if(existingUser)
        {
            return true;
        }

        return false;
    }
}

async function existingPlaylist(id)
{    
    const existingPlaylist = await db.collection("playlists").findOne({id: parseInt(id)});

    if(existingPlaylist)
    {
        // console.log("aspodufhbepirufh, ", id);
        return true;
    }
    return false;
}

async function existingSong(id)
{    
    const existingSong = await db.collection("songs").findOne({id: parseInt(id)});

    if(existingSong)
    {
        // console.log("aspodufhbepirufh, ", id);
        return true;
    }
    return false;
}

async function songInPlaylist(song, playlist)
{    
    const exists = await db.collection("playlists").findOne({id: parseInt(playlist), songId: parseInt(song)});
    // console.log("here: ", exists);

    if(exists)
    {
        // console.log("aspodufhbepirufh");
        return true;
    }
    return false;
}

async function existingComment(comment, playlist)
{    
    const exists = await db.collection("playlists").findOne(
        {id: parseInt(playlist)}, 
        {projection: {comments: {$elemMatch: {id: parseInt(comment)}}}});
    // console.log("here: ", exists);

    if(exists)
    {
        // console.log("aspodufhbepirufh");
        return true;
    }
    return false;
}

//endpoints

//users
//get all users
app.get("/api/users", async (req, res) => {
    try
    {
        const users = await db.collection("users").find({}).toArray();
        res.status(200).json({status: "success", data: users});
    }
    catch(error)
    {
        console.error("Error getting users: ", error);
        res.status(500).json({status: "failed", message: "Could not get all users"});
    }
});


//add new user
app.post("/api/users/add-user", async (req, res) => {
    try
    {
        const 
        {
            name,
            surname,
            email,
            password,
            profilePicture,
            bio,
            instagram,
            facebook,
            tiktok,
            twitter,
            playlists,
            following,
            followers
        } = req.body;
        
        // const newUser = req.body;
        // console.log("req body: ", req.body.id);
        
        if(!name || !surname || !email || !password)
        {
            return res.status(400).json({ status: "failed", message: "name, surname, email and password are required" });
        }

        const existingUser = await db.collection("users").findOne({email});

        if(existingUser)
        {
            return res.status(400).json({status: "failed", message: `User with email ${email} already in use`});
        }

        const id = await generateId();

        const newUser = {
            id,
            name,
            surname,
            email,
            password,
            profilePicture: profilePicture || null,
            bio: bio || null,
            instagram: instagram || null,
            facebook: facebook || null,
            tiktok: tiktok || null,
            twitter: twitter || null,
            playlists: playlists || null,
            following: following || null,
            followers: followers || null
        }

        const result = await db.collection("users").insertOne(newUser);

        res.status(201).json({
            status: "success",
            message: "User created successfully",
            data: newUser 
        });
    }
    catch(error)
    {
        console.error("Error while creating new user: ", error);
        res.status(500).json({status: "failed", message: "Could not create new user"});
    }
});

//delete a user
app.delete("/api/users/delete-user/:id", async (req, res) => {

    const { id } = req.params;

    try
    {
        const exists = await existingUser(false, id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: `User with id ${id} does not exist`});
        }

        const result = await db.collection("users").deleteOne({ id : parseInt(id)});

        if(result.deletedCount === 1)
        {
            res.status(200).json({status: "success", message: `User with id ${id} deleted successfully`});
        }
        else
        {
            res.status(500).json({status: "failed", message: `Could not delete user with id ${id}`});
        }
    }
    catch (error)
    {
        console.error("Error when deleting user: ", error);
        res.status(500).json({status: "failed", message: "Could not delete user"});
    }
});

//update user
app.put("/api/users/update-user/:id", async (req, res) => {
    const { id } = req.params;

    const 
    {
        name,
        surname,
        email,
        password,
        profilePicture,
        bio,
        instagram,
        facebook,
        tiktok,
        twitter,
        playlists,
        following,
        followers
    } = req.body;

    try
    {
        const exists = await existingUser(false, id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: `User with id ${id} does not exist`});
        }

        let updated = {};

        if(name)
        {
            updated.name = name;
        }
        if(surname)
        {
            updated.surname = surname;
        }
        if(email)
        {
            updated.email = email;
        }
        if(password)
        {
            updated.password = password;
        }
        if(profilePicture)
        {
            updated.profilePicture = profilePicture;
        }
        if(bio)
        {
            updated.bio = bio;
        }
        if(instagram)
        {
            updated.instagram = instagram;
        }
        if(facebook)
        {
            updated.facebook = facebook;
        }
        if(tiktok)
        {
            updated.tiktok = tiktok;
        }
        if(twitter)
        {
            updated.twitter = twitter;
        }
        if(playlists)
        {
            updated.playlists = playlists;
        }
        if(following)
        {
            updated.following = following;
        }        
        if(followers)
        {
            updated.followers = followers;
        }

        await db.collection("users").updateOne({id: parseInt(id)}, {$set: updated});

        res.status(200).json({status: "success", message: "user updated successfully"});
    }
    catch(error)
    {
        console.error("Error when updating user ", error);
        res.status(500).json({status: "failed", message: "Could not update user"});
    }
});

//get user by id
app.get("/api/users/:id", async (req, res) => {
    const { id } = req.params;

    try
    {
        const exists = await existingUser(false, id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: `User with is ${id} does not exist`});
        }

        const user = await db.collection("users").findOne({ id: parseInt(id) });

        res.status(200).json({status: "success", data: user});
    }
    catch(error)
    {
        console.error("Error when getting user by id", error);
        res.status(500).json({status: "failed", message: "Could not get user by id"});
    }
});

//login
app.post("/api/users/login", async (req, res) => {

    const { email, password } = req.body;
    try
    {
        if(!email || !password)
        {
            return res.status(400).json({status: "failed", message: "email or password missing"});
        }

        const user = await db.collection("users").findOne({email});

        if(!user)
        {
            return res.status(401).json({status: "failed", message: "email incorrect"});
        }

        if(password !== user.password)
        {
            return res.status(401).json({status: "failed", message: "password incorrect"});
        }

        res.status(200).json({status: "success", message: "login successful", data: {id: user.id, name: user.name, email: user.email}});
    }
    catch(error)
    {
        console.error("Error when login ", error);
        res.status(500).json({status: "failed", message: "could not login"});
    }
});

//playlists
//create playlists

app.post("/api/playlist/create-playlist", async (req, res) => {
    try
    {
        const { userId, name, category, description, coverImage, hashTags, songId, comments } = req.body;

        // console.log("userId: ", userId, "name: ", name);
        // console.log("req body: ", req.body);

        if(!userId || !name)
        {
            return res.status(400).json({status: "Failed", message: "userId and playlist name required"});
        }

        const existingUser = await db.collection("users").findOne({id: userId});

        if(!existingUser)
        {
            return res.status(404).json({status: "failed", message: `No user with id ${userId} found`});
        }

        const id = await generatePlaylistId();

        const newPlaylist = {
            id,
            userId,
            name,
            category: category || '',
            description: description || '',
            coverImage: coverImage || '',
            hashTags: hashTags || '',
            songId: songId || [],
            comments: comments || []
        };

        // console.log("newPlaylist: ", newPlaylist)

        const result = await db.collection("playlists").insertOne(newPlaylist);

        const updateUsers = await db.collection("users").updateOne(
            { id: userId },
            {$push: {playlists: id}}
        );

        if(result.acknowledged && updateUsers.modifiedCount === 1)
        {
            return res.status(201).json({status: "success", message: "Playlist created and added to users playlists", data: newPlaylist});
        }
        else
        {
            return res.status(500).json({status: "failed", message: "Playlist created but could not add playlist to users playlists"});
        }

        // res.status(201).json({status: "success", message: "Playlist created successfully", playlist: newPlaylist});
    }
    catch(error)
    {
        console.error("Error while creating playlist: ", error);
        return res.status(500).json({status: "failed", message: "Could not create playlist"});
    }
});

//get all playlists
app.get("/api/playlists", async (req, res) => {
    try
    {
        const playlists = await db.collection("playlists").find({}).toArray();
        res.status(200).json({status: "success", message: "all playlists", data: playlists});
    }
    catch(error)
    {
        console.error("Error getting all playlists: ", error);
        res.status(500).json({status: "failed", message: "Could not get all playlists"});
    }
});

//update playlist
app.put("/api/playlists/update-playlist/:id", async (req, res) => {
    const {id} = req.params;
    const 
    {
        name,
        category,
        description,
        coverImage,
        hashTags,
    } = req.body;
    
    try
    {
        const exists = await existingPlaylist(id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: `Could not find playlist with id ${id}`});
        }

        let updated = {};

        if(name)
        {
            updated.name = name;
        }
        if(category)
        {
            updated.category = category;
        }
        if(description)
        {
            updated.description = description;
        }
        if(coverImage)
        {
            updated.coverImage = coverImage;
        }
        if(hashTags)
        {
            updated.hashTags = hashTags;
        }

        await db.collection("playlists").updateOne({id: parseInt(id)}, {$set: updated});

        res.status(200).json({status: "success", message: "Playlist updated"});
    }
    catch(error)
    {
        console.error("Error when updating playlist: ", error);
        res.status(500).json({status: "failed", message: "Could not update playlist"});
    }
});

//delete playlist
app.delete("/api/playlists/delete-playlist/:id", async (req, res) => {
    const {id} = req.params;

    try
    {
        const exists = await existingPlaylist(id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: `Playlist with id ${id} does not exist`});
        }

        const result = await db.collection("playlists").deleteOne({id: parseInt(id)});

        if(result.deletedCount === 1)
        {
            await db.collection("users").updateMany({}, {$pull: {playlists: parseInt(id)}});

            return res.status(200).json({status: "success", message: `Playlist with id ${id} delete`});
        }
        else
        {
            return res.status(500).json({status: "failed", message: `Could not delete playlist with id ${id}`});
        }
    }
    catch(error)
    {
        console.error("Error when deleting playlist: ", error);
        return res.status(500).json({status: "failed", message: "Could not delete playlist"});
    }
});

//get playlist by id
app.get("/api/playlists/:id", async (req, res) => {
    const {id} = req.params;
    
    try
    {
        const exists = await existingPlaylist(id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: `Could not find playlist with id ${id}`});
        }

        const playlist = await db.collection("playlists").findOne({id: parseInt(id)});

        return res.status(200).json({status: "success", data: playlist});
    }
    catch(error)
    {
        console.error("Error when getting playlist with id: ", error);
        return res.status(500).json({status: "failed", message: "Could not get playlist by id"});
    }    
});

//add song
app.put("/api/playlists/add-song/:id", async (req, res) => {

    const {id} = req.params;

    const { songId } = req.body;

    try
    {
        const playlistExists = await existingPlaylist(id);
        const songExists = await existingSong(songId);

        if(songExists === false)
        {
            return res.status(404).json({status: "failed", message: `Song with id ${songId} does not exist`});
        }

        if(playlistExists === false)
        {
            return res.status(404).json({status: "failed", message: `Playlist with id ${id} does not exist`});
        }

        const exists = await songInPlaylist(songId, id);

        if(exists === true)
        {
            return res.status(409).json({status: "failed", message: "Song already in playlist"});
        }

        const result = await db.collection("playlists").updateOne({id: parseInt(id)}, {$push: {songId: songId}});


        if(result.modifiedCount === 1)
        {
            return res.status(200).json({status: "success", message: "Added song to playlist"});
        }
        else
        {
            return res.status(500).json({status: "failed", message: "Could not add song to playlist"});
        }
    }
    catch(error)
    {
        console.error("Error when adding song to playlist: ", error);
        return res.status(500).json({status: "failed", message: "Could not add song to playlist"});
    }
});

//delete song from playlist
app.put("/api/playlists/delete-song/:id", async (req, res) => {

    const {id} = req.params;

    const { songId } = req.body;

    try
    {
        const playlistExists = await existingPlaylist(id);
        const songExists = await existingSong(songId);

        if(songExists === false)
        {
            return res.status(404).json({status: "failed", message: `Song with id ${songId} does not exist`});
        }

        if(playlistExists === false)
        {
            return res.status(404).json({status: "failed", message: `Playlist with id ${id} does not exist`});
        }

        const exists = await songInPlaylist(songId, id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: "Song not in playlist"});
        }

        const result = await db.collection("playlists").updateOne({id: parseInt(id)}, {$pull: {songId: songId}});


        if(result.modifiedCount === 1)
        {
            return res.status(200).json({status: "success", message: "removed song from playlist"});
        }
        else 
        {
            return res.status(404).json({ status: "failed", message: "Song not found in the playlist" });
        }
    }
    catch(error)
    {
        console.error("Error when removing song from playlist: ", error);
        return res.status(500).json({status: "failed", message: "Could not remove song from playlist"});
    }
});

//add comment to a playlist
app.put("/api/playlists/add-comment/:id", async (req, res) => {
    const {id} = req.params;

    const {userId, text, image} = req.body;

    try
    {
        const exists = await existingPlaylist(id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: "Playlist does not exists"});
        }

        const commentId = await generateCommentId(id);

        const newComment = 
        {
            id: commentId,
            userId,
            text,
            image: image || null,
            timestamp: new Date(),
        };

        const result = await db.collection("playlists").updateOne(
            {id: parseInt(id)},
            { $push: {comments: newComment}}
        );

        if(result.modifiedCount === 1)
        {
            return res.status(201).json({status: "success", message: "Comment added"});
        }
        else
        {
            return res.status(500).json({status: "failed", message: "Could not add comment"});
        }
    }
    catch(error)
    {
        console.error("Error when adding comment: ", error);
        return res.status(500).json({status: "failed", message: "Could not add comment"});
    }
});

//delete comment
app.put("/api/playlists/delete-comment/:id", async (req, res) => {
    const {id} = req.params;

    const {commentId} = req.body;

    try
    {
        const exists = await existingPlaylist(id);
        const commentExists = await existingComment(commentId, id);

        if(exists === false)
        {
            return res.status(404).json({status: "failed", message: "Playlist does not exist"});
        }
        if(commentExists === false)
        {
            return res.status(404).json({status: "failed", message: "Comment does not exist"});
        }

        const result = await db.collection("playlists").updateOne(
            {id: parseInt(id)}, 
            {$pull: {comments: {id: parseInt(commentId)}}}
        );

        if(result.modifiedCount === 1)
        {
            return res.status(200).json({status: "success", message: "Deleted comment"});
        }
        else
        {
            return res.status(500).json({status: "failed", message: "Could not delete comment"});
        }
    }
    catch(error)
    {
        console.error("Error when deleting comment: ", error);
        return res.status(500).json({status: "failed", message: "Could not delete comment"});
    }
});








//docker build -t image .

//docker run --name express -p 3005:3000 image