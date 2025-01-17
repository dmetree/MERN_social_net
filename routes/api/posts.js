const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   Post api/posts
// @desc    Create a post
// @access  Private

router.post('/', [auth, [
    check('text', 'Text is required').not().isEmpty()
]],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const user = await User.findById(req.user.id).select('-password');
            const newPost = Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            })

            const post = await newPost.save();
            res.json(post);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error')
        }
    });


// @route   Get api/posts
// @desc    Get posts
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 }); //start with most recent. If Oldest use '1'
        return res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error')
    }
});


// @route   Get api/posts/:id
// @desc    Get post by id
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        return res.json(post);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server error')
    }
});


// @route   DELETE api/posts/:id
// @desc    Delete post by id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (post === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check if the user is the owner of the post
        if(post.user.toString() !== req.user.id){
            return res.status(401).json({msg: 'User not authorized'})
        }
        await post.remove()
        return res.json({msg: 'Post removed'});
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server error')
    }
});



// @route   PUT api/posts/like/:id
// @desc    Add like
// @access  Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        // check if post has already been liked
        if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0){
            return res.status(400).json({msg: 'Post already liked'});
        }
        post.likes.unshift({ user: req.user.id });

        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error')
    }
});


// @route   PUT api/posts/unlike/:id
// @desc    Add like
// @access  Private
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        // check if post has already been liked
        if (post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
            return res.status(400).json({ msg: 'Post has not been liked' });
        }
        
        // Get remove index
        const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);
        // remove like from the array
        post.likes.splice(removeIndex, 1);

        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error')
    }
});



// @route   POST api/posts/comment/:id
// @desc    Create a comment
// @access  Private

router.post('/comment/:id', [auth, [
    check('text', 'Text is required').not().isEmpty()
]],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const user = await User.findById(req.user.id).select('-password');
            const post = await Post.findById(req.params.id);
            const newComment = {
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            }

            post.comments.unshift(newComment);

            await post.save();
            res.json(post.comments);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error')
        }
    });



// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Delete a comment
// @access  Private
// router.delete('/comments/:id/:comment_id', auth, async (req, res) => {
        
//         try {
//             const post = await Post.findById(req.params.id);
//             // Find comment
//             const comment = post.comments.findById(comment => comment.id === req.params.comments_id )

//             // Make sure comment exists
//             if(!comment){
//                 return res.status(404).json({msg: 'Comment not found'});
//             }

//             // Check user (that this is the user who made the comment)
//             if(comment.user.toString() !== req.user.id){
//                 return res.status(401).json({ msg: 'Not authorized' });
//             }

//             // Get remove index
//             const removeIndex = post.comments.map(comment => comment.user.toString()).indexOf(req.user.id);
//             // remove like from the array
//             post.comments.splice(removeIndex, 1);

//             await post.save();

//             res.json(post.comments);
           
//         } catch (err) {
//             console.error(err.message);
//             res.status(500).send('Server error')
//         }
//     });


router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        // Pull out comment
        const comment = post.comments.find(
            comment => comment.id === req.params.comment_id
        );
        // Make sure comment exists
        if (!comment) {
            return res.status(404).json({ msg: 'Comment does not exist' });
        }
        // Check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        post.comments = post.comments.filter(
            ({ id }) => id !== req.params.comment_id
        );

        await post.save();

        return res.json(post.comments);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});


module.exports = router;